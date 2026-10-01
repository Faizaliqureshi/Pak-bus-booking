import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSegmentOverlapping } from "@/lib/seat-availability";
import { adjacentSeatNumbers } from "@/lib/seat-layout";

export const MIXED_GENDER_SEAT_MSG =
  "Male and female passengers from different bookings cannot sit together. Book 2–3 adjacent mixed seats in the same booking.";

export function isOppositeBinaryGender(
  left?: string | null,
  right?: string | null,
): boolean {
  const a = left?.toUpperCase();
  const b = right?.toUpperCase();
  return (
    (a === "MALE" && b === "FEMALE") || (a === "FEMALE" && b === "MALE")
  );
}

type OccupiedNeighbor = {
  seatNumber: string;
  gender: string;
  boardingOrder: number;
  dropOrder: number;
};

function mixedBesideOthers(args: {
  gender: string;
  boardingOrder: number;
  dropOrder: number;
  sameBookingSeats: Set<string>;
  neighbors: OccupiedNeighbor[];
}): string | null {
  for (const neighbor of args.neighbors) {
    if (args.sameBookingSeats.has(neighbor.seatNumber)) continue;
    if (!isOppositeBinaryGender(args.gender, neighbor.gender)) continue;
    if (
      !isSegmentOverlapping(
        args.boardingOrder,
        args.dropOrder,
        neighbor.boardingOrder,
        neighbor.dropOrder,
      )
    ) {
      continue;
    }
    return MIXED_GENDER_SEAT_MSG;
  }
  return null;
}

async function occupiedNeighbors(
  tripId: string,
  seatNumbers: string[],
): Promise<OccupiedNeighbor[]> {
  if (seatNumbers.length === 0) return [];
  const tickets = await prisma.ticket.findMany({
    where: {
      seatNumber: { in: seatNumbers },
      booking: { tripId, paymentStatus: PaymentStatus.PAID },
    },
    select: {
      seatNumber: true,
      passengerGender: true,
      boardingStop: { select: { stopOrder: true } },
      dropStop: { select: { stopOrder: true } },
    },
  });
  return tickets.map((ticket) => ({
    seatNumber: ticket.seatNumber,
    gender: ticket.passengerGender,
    boardingOrder: ticket.boardingStop.stopOrder,
    dropOrder: ticket.dropStop.stopOrder,
  }));
}

export async function assertNoMixedGenderBesideOthers(input: {
  tripId: string;
  layoutType: string;
  totalSeats: number;
  seats: { seatNumber: string; gender: string }[];
  boardingOrder: number;
  dropOrder: number;
  sameBookingSeatNumbers: string[];
}): Promise<string | null> {
  const adjacent = new Set<string>();
  for (const seat of input.seats) {
    for (const mate of adjacentSeatNumbers(
      seat.seatNumber,
      input.totalSeats,
      input.layoutType,
    )) {
      adjacent.add(mate);
    }
  }
  const neighbors = await occupiedNeighbors(input.tripId, [...adjacent]);
  const sameBookingSeats = new Set(input.sameBookingSeatNumbers);
  for (const seat of input.seats) {
    const conflict = mixedBesideOthers({
      gender: seat.gender,
      boardingOrder: input.boardingOrder,
      dropOrder: input.dropOrder,
      sameBookingSeats,
      neighbors,
    });
    if (conflict) return conflict;
  }
  return null;
}
