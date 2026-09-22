import { PaymentStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { calculatePayable } from "@/lib/payment-fees";
import { prisma } from "@/lib/prisma";

export type BookingDocument = {
  pnr: string;
  invoiceNumber: string;
  issuedAt: string;
  paymentMethod: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  qrPayload: string;
  operatorName: string;
  busNumber: string;
  routeName: string;
  originCity: string;
  destinationCity: string;
  departureTime: string;
  arrivalTime: string;
  boardingTerminal: string;
  dropTerminal: string;
  passengers: Array<{
    seatNumber: string;
    name: string;
    cnic: string | null;
    gender: string;
  }>;
  fare: {
    baseFare: number;
    gatewayName: string | null;
    flatFee: number;
    percentageFee: number;
    percentageAmount: number;
    totalPaid: number;
  };
};

function operatorLabel(name: string): string {
  return name.replace(/\s+Operator$/i, "").trim();
}

export async function loadOwnedPaidBooking(
  rawPnr: string,
): Promise<BookingDocument | null> {
  const session = await getSessionUser();
  if (!session) return null;

  const pnr = decodeURIComponent(rawPnr).trim().toUpperCase();
  const booking = await prisma.booking.findFirst({
    where: {
      userId: session.id,
      paymentStatus: PaymentStatus.PAID,
      pnr: { equals: pnr, mode: "insensitive" },
    },
    include: {
      paymentGateway: true,
      tickets: {
        include: { boardingStop: true, dropStop: true },
        orderBy: { seatNumber: "asc" },
      },
      trip: {
        include: {
          bus: { include: { operator: { select: { name: true } } } },
          route: true,
        },
      },
    },
  });

  if (!booking || booking.tickets.length === 0) return null;

  const first = booking.tickets[0]!;
  const baseFare = Number(booking.totalPrice);
  const gateway = booking.paymentGateway;
  const quote = calculatePayable(
    baseFare,
    gateway ? Number(gateway.flatFee) : 0,
    gateway ? Number(gateway.percentageFee) : 0,
  );

  return {
    pnr: booking.pnr,
    invoiceNumber: `INV-${booking.pnr}`,
    issuedAt: booking.createdAt.toISOString(),
    paymentMethod: booking.paymentMethod,
    contactEmail: booking.contactEmail,
    contactPhone: booking.contactPhone,
    qrPayload:
      booking.qrCodeUrl ||
      `PNR:${booking.pnr}|TRIP:${booking.tripId}|SEATS:${booking.tickets
        .map((t) => t.seatNumber)
        .join(",")}`,
    operatorName: operatorLabel(booking.trip.bus.operator.name),
    busNumber: booking.trip.bus.busNumber,
    routeName: booking.trip.route.name,
    originCity: booking.trip.route.originCity,
    destinationCity: booking.trip.route.destinationCity,
    departureTime: booking.trip.departureTime.toISOString(),
    arrivalTime: booking.trip.arrivalTime.toISOString(),
    boardingTerminal: first.boardingStop.stationName,
    dropTerminal: first.dropStop.stationName,
    passengers: booking.tickets.map((t) => ({
      seatNumber: t.seatNumber,
      name: t.passengerName,
      cnic: t.passengerCnic,
      gender: t.passengerGender,
    })),
    fare: {
      baseFare: quote.baseFare,
      gatewayName: gateway?.name ?? booking.paymentMethod,
      flatFee: quote.flatFee,
      percentageFee: quote.percentageFee,
      percentageAmount: quote.percentageAmount,
      totalPaid: quote.totalPayable,
    },
  };
}
