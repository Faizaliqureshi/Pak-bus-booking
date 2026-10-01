import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCompanyPolicy,
  quoteCompanyRefund,
} from "@/lib/cancel-policy";
import { releaseTripSeats } from "@/lib/trip-inventory";
import { creditWalletRefund, walletReference } from "@/lib/wallet";

export class BookingCancelError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "BookingCancelError";
    this.statusCode = statusCode;
  }
}

function seatList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((s) => String(s ?? "").trim())
        .filter((s) => /^\d+$/.test(s)),
    ),
  ];
}

export type CancelActor =
  | { type: "passenger"; userId: string }
  | { type: "partner"; userId: string };

export type CancelSeatsResult = {
  cancelledSeats: string[];
  refundedAmount: number;
  refundPercent: number;
  remainingSeats: string[];
  paymentStatus: PaymentStatus;
  pnr: string;
  companyName: string;
};

/**
 * Cancel paid tickets, free the seats, and refund the fare to the passenger wallet.
 */
export async function cancelBookedSeats(input: {
  actor: CancelActor;
  seatNumbers: unknown;
  pnr?: string;
  tripId?: string;
}): Promise<CancelSeatsResult> {
  const seats = seatList(input.seatNumbers);
  if (seats.length === 0) {
    throw new BookingCancelError("Select at least one seat to cancel.");
  }

  const booking = await loadPaidBooking(input);
  const remainingTickets = booking.tickets;
  const chosen = remainingTickets.filter((t) => seats.includes(t.seatNumber));
  if (chosen.length === 0) {
    throw new BookingCancelError("Those seats are not on this paid booking.", 404);
  }
  if (chosen.some((t) => t.isBoarded)) {
    throw new BookingCancelError("A boarded seat cannot be cancelled.");
  }

  const operatorId = booking.trip.bus.operatorId;
  const companyName = booking.trip.bus.operator.name.replace(
    /\s+Operator$/i,
    "",
  );
  const policy = await getCompanyPolicy(operatorId, companyName);
  const unit = Number(booking.totalPrice) / remainingTickets.length;
  const cancelledSeats = chosen.map((t) => t.seatNumber);
  const quote = quoteCompanyRefund({
    policy,
    departure: booking.trip.departureTime,
    fare: unit * cancelledSeats.length,
    actor: input.actor.type,
  });
  if (!quote.allowed) {
    throw new BookingCancelError(quote.reason || "This company does not allow that cancellation.");
  }

  const refundedAmount = quote.refundAmount;
  const keep = remainingTickets
    .filter((t) => !seats.includes(t.seatNumber))
    .map((t) => t.seatNumber);
  const nextStatus =
    keep.length === 0 ? PaymentStatus.REFUNDED : PaymentStatus.PAID;

  await prisma.$transaction(async (tx) => {
    await tx.ticket.deleteMany({
      where: {
        bookingId: booking.id,
        seatNumber: { in: cancelledSeats },
      },
    });
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        heldSeats: keep.join(",") || null,
        totalPrice: Math.round(unit * keep.length),
        paymentStatus: nextStatus,
      },
    });
  });

  await releaseTripSeats(booking.tripId, cancelledSeats);
  await creditWalletRefund(
    booking.userId,
    refundedAmount,
    refundedAmount > 0
      ? `${policy.companyName} refund ${quote.refundPercent}% for seat ${cancelledSeats.join(", ")} on ${booking.pnr}`
      : `${policy.companyName} cancellation (no refund) seat ${cancelledSeats.join(", ")} on ${booking.pnr}`,
    walletReference("RF"),
  );

  return {
    cancelledSeats,
    refundedAmount,
    refundPercent: quote.refundPercent,
    remainingSeats: keep,
    paymentStatus: nextStatus,
    pnr: booking.pnr,
    companyName: policy.companyName,
  };
}

async function loadPaidBooking(input: {
  actor: CancelActor;
  pnr?: string;
  tripId?: string;
  seatNumbers: unknown;
}) {
  const seats = seatList(input.seatNumbers);

  if (input.actor.type === "passenger") {
    const pnr = String(input.pnr ?? "").trim();
    if (!pnr) throw new BookingCancelError("PNR is required.");
    const booking = await prisma.booking.findFirst({
      where: {
        pnr,
        userId: input.actor.userId,
        paymentStatus: PaymentStatus.PAID,
      },
      include: {
        tickets: true,
        trip: {
          select: {
            departureTime: true,
            bus: {
              select: {
                operatorId: true,
                operator: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!booking) {
      throw new BookingCancelError("Paid booking not found.", 404);
    }
    return booking;
  }

  const tripId = String(input.tripId ?? "").trim();
  if (!tripId) throw new BookingCancelError("Trip is required.");
  const ticket = await prisma.ticket.findFirst({
    where: {
      seatNumber: { in: seats },
      booking: {
        tripId,
        paymentStatus: PaymentStatus.PAID,
        trip: { bus: { operatorId: input.actor.userId } },
      },
    },
    include: {
      booking: {
        include: {
          tickets: true,
          trip: {
            select: {
              departureTime: true,
              bus: {
                select: {
                  operatorId: true,
                  operator: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!ticket) {
    throw new BookingCancelError("Paid seat not found on your fleet.", 404);
  }
  return ticket.booking;
}
