import { createHmac } from "crypto";
import { parseHeldSeats } from "@/lib/checkout-utils";
import { prisma } from "@/lib/prisma";

const WEBHOOK_TIMEOUT_MS = 4_000;

export async function notifyPartnerBookingPaid(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      tickets: {
        select: {
          seatNumber: true,
          passengerName: true,
          passengerGender: true,
        },
      },
      trip: {
        include: {
          bus: {
            select: {
              id: true,
              busNumber: true,
              operatorId: true,
              externalId: true,
              operator: {
                select: {
                  partnerWebhook: true,
                },
              },
            },
          },
          route: {
            select: {
              id: true,
              name: true,
              originCity: true,
              destinationCity: true,
              externalId: true,
            },
          },
        },
      },
    },
  });

  const hook = booking?.trip.bus.operator.partnerWebhook;
  if (!booking || !hook?.isActive || !hook.url) return;

  const seats = booking.tickets.length
    ? booking.tickets.map((t) => t.seatNumber)
    : parseHeldSeats(booking.heldSeats);

  const payload = {
    event: "booking.paid",
    sentAt: new Date().toISOString(),
    data: {
      bookingId: booking.id,
      pnr: booking.pnr,
      paymentStatus: booking.paymentStatus,
      totalFare: Number(booking.totalPrice),
      seats,
      passengers: booking.tickets.map((t) => ({
        seatNumber: t.seatNumber,
        name: t.passengerName,
        gender: t.passengerGender,
      })),
      trip: {
        id: booking.tripId,
        externalId: booking.trip.externalId,
        departureTime: booking.trip.departureTime.toISOString(),
        arrivalTime: booking.trip.arrivalTime.toISOString(),
        busNumber: booking.trip.bus.busNumber,
        busExternalId: booking.trip.bus.externalId,
        route: booking.trip.route.name,
        originCity: booking.trip.route.originCity,
        destinationCity: booking.trip.route.destinationCity,
        routeExternalId: booking.trip.route.externalId,
      },
    },
  };

  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", hook.secret)
    .update(body)
    .digest("hex");

  try {
    await fetch(hook.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ticketpass-signature": signature,
        "x-ticketpass-event": "booking.paid",
      },
      body,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[partner-notify] booking.paid failed", bookingId, error);
  }
}
