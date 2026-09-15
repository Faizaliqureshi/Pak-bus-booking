import { Gender, PaymentStatus, TripSeatStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveLocksForTrip } from "@/lib/redis-lock";

export type SeatStatus =
  | "AVAILABLE"
  | "BOOKED"
  | "LOCKED_BY_YOU"
  | "LOCKED_BY_OTHER";

export interface SeatInfo {
  seatNumber: string;
  status: SeatStatus;
  gender?: Gender;
  bookedSegment?: {
    boardingStopOrder: number;
    dropStopOrder: number;
  };
}

export interface SegmentAvailabilityResponse {
  tripId: string;
  boardingStop: { id: string; name: string; order: number };
  dropStop: { id: string; name: string; order: number };
  totalSeats: number;
  availableSeatsCount: number;
  seats: SeatInfo[];
}

export class SeatAvailabilityError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = "SeatAvailabilityError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** Overlap when max(startA, startB) < min(endA, endB) using stopOrder. */
export function isSegmentOverlapping(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

export async function getAvailableSeatsForSegment(
  tripId: string,
  boardingStopId: string,
  dropStopId: string,
  currentUserId?: string,
): Promise<SegmentAvailabilityResponse> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      bus: true,
      route: {
        include: {
          stops: { orderBy: { stopOrder: "asc" } },
        },
      },
    },
  });

  if (!trip) {
    throw new SeatAvailabilityError("Trip not found.", 404, "TRIP_NOT_FOUND");
  }

  const boardingStop = trip.route.stops.find((s) => s.id === boardingStopId);
  const dropStop = trip.route.stops.find((s) => s.id === dropStopId);

  if (!boardingStop || !dropStop) {
    throw new SeatAvailabilityError(
      "Invalid boarding or drop stop ID.",
      400,
      "INVALID_STOP",
    );
  }

  if (boardingStop.stopOrder >= dropStop.stopOrder) {
    throw new SeatAvailabilityError(
      "Boarding stop must precede the drop stop.",
      400,
      "INVALID_SEGMENT",
    );
  }

  const [tickets, redisLocks, inventory] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        booking: {
          tripId,
          paymentStatus: PaymentStatus.PAID,
        },
      },
      include: {
        boardingStop: true,
        dropStop: true,
      },
    }),
    getActiveLocksForTrip(tripId),
    prisma.tripSeat.findMany({
      where: { tripId, status: TripSeatStatus.BOOKED },
      select: { seatNumber: true },
    }),
  ]);

  const partnerBooked = new Set(inventory.map((s) => s.seatNumber));

  const lockBySeat = new Map(
    redisLocks.map((lock) => [lock.seatNumber, lock.userId]),
  );

  const seats: SeatInfo[] = [];
  let availableSeatsCount = 0;

  for (let i = 1; i <= trip.bus.totalSeats; i++) {
    const seatNumber = String(i);

    if (partnerBooked.has(seatNumber)) {
      seats.push({ seatNumber, status: "BOOKED" });
      continue;
    }

    const conflicting = tickets.find((ticket) => {
      if (ticket.seatNumber !== seatNumber) return false;
      return isSegmentOverlapping(
        boardingStop.stopOrder,
        dropStop.stopOrder,
        ticket.boardingStop.stopOrder,
        ticket.dropStop.stopOrder,
      );
    });

    if (conflicting) {
      seats.push({
        seatNumber,
        status: "BOOKED",
        gender: conflicting.passengerGender,
        bookedSegment: {
          boardingStopOrder: conflicting.boardingStop.stopOrder,
          dropStopOrder: conflicting.dropStop.stopOrder,
        },
      });
      continue;
    }

    const lockHolder = lockBySeat.get(seatNumber);
    if (lockHolder) {
      seats.push({
        seatNumber,
        status:
          currentUserId && lockHolder === currentUserId
            ? "LOCKED_BY_YOU"
            : "LOCKED_BY_OTHER",
      });
      continue;
    }

    seats.push({ seatNumber, status: "AVAILABLE" });
    availableSeatsCount += 1;
  }

  return {
    tripId,
    boardingStop: {
      id: boardingStop.id,
      name: boardingStop.stationName,
      order: boardingStop.stopOrder,
    },
    dropStop: {
      id: dropStop.id,
      name: dropStop.stationName,
      order: dropStop.stopOrder,
    },
    totalSeats: trip.bus.totalSeats,
    availableSeatsCount,
    seats,
  };
}
