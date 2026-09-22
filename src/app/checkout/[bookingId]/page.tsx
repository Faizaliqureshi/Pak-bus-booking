import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PaymentStatus } from "@prisma/client";
import { TicketPassLogo } from "@/components/brand/TicketPassLogo";
import { CheckoutForm } from "@/components/booking/CheckoutForm";
import { parseHeldSeats } from "@/lib/checkout-utils";
import { prisma } from "@/lib/prisma";

interface CheckoutPageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { bookingId } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      trip: {
        include: {
          bus: {
            include: {
              operator: { select: { name: true } },
            },
          },
          route: true,
        },
      },
    },
  });

  if (!booking) notFound();

  if (booking.paymentStatus === PaymentStatus.PAID) {
    redirect(`/ticket/${booking.pnr}`);
  }

  const heldSeats = parseHeldSeats(booking.heldSeats);
  if (heldSeats.length === 0) {
    notFound();
  }

  const boardingStop = booking.boardingStopId
    ? await prisma.routeStop.findUnique({ where: { id: booking.boardingStopId } })
    : null;
  const dropStop = booking.dropStopId
    ? await prisma.routeStop.findUnique({ where: { id: booking.dropStopId } })
    : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e8f5f1,_#f7faf9_45%,_#eef2f0)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Link href="/" className="print:hidden">
          <TicketPassLogo tone="light" size="sm" />
        </Link>
        <div className="mt-6">
          <CheckoutForm
            booking={{
              id: booking.id,
              pnr: booking.pnr,
              totalPrice: Number(booking.totalPrice),
              lockExpiresAt: booking.lockExpiresAt?.toISOString() ?? null,
              heldSeats,
              contactPhone: booking.contactPhone,
              contactEmail: booking.contactEmail,
              trip: {
                id: booking.trip.id,
                departureTime: booking.trip.departureTime.toISOString(),
                arrivalTime: booking.trip.arrivalTime.toISOString(),
                basePrice: Number(booking.trip.basePrice),
                busNumber: booking.trip.bus.busNumber,
                operatorName: booking.trip.bus.operator.name.replace(
                  /\s+Operator$/i,
                  "",
                ),
                routeName: booking.trip.route.name,
                originCity: booking.trip.route.originCity,
                destinationCity: booking.trip.route.destinationCity,
              },
              boardingStop: boardingStop
                ? { id: boardingStop.id, name: boardingStop.stationName }
                : null,
              dropStop: dropStop
                ? { id: dropStop.id, name: dropStop.stationName }
                : null,
            }}
          />
        </div>
      </div>
    </main>
  );
}
