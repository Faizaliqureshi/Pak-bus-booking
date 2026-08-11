import { notFound } from "next/navigation";
import { PaymentStatus } from "@prisma/client";
import { ETicketView } from "@/components/booking/ETicketView";
import { prisma } from "@/lib/prisma";

interface TicketPageProps {
  params: Promise<{ pnr: string }>;
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { pnr } = await params;

  const booking = await prisma.booking.findUnique({
    where: { pnr: decodeURIComponent(pnr) },
    include: {
      tickets: {
        include: {
          boardingStop: true,
          dropStop: true,
        },
        orderBy: { seatNumber: "asc" },
      },
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

  if (!booking || booking.paymentStatus !== PaymentStatus.PAID) {
    notFound();
  }

  if (booking.tickets.length === 0) {
    notFound();
  }

  const first = booking.tickets[0];
  const qrPayload =
    booking.qrCodeUrl ||
    `PNR:${booking.pnr}|TRIP:${booking.tripId}|SEATS:${booking.tickets
      .map((t) => t.seatNumber)
      .join(",")}`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e8f5f1,_#f7faf9_45%,_#eef2f0)] print:bg-white">
      <ETicketView
        ticket={{
          pnr: booking.pnr,
          qrPayload,
          totalPrice: Number(booking.totalPrice),
          paymentMethod: booking.paymentMethod,
          contactEmail: booking.contactEmail,
          contactPhone: booking.contactPhone,
          operatorName: booking.trip.bus.operator.name.replace(
            /\s+Operator$/i,
            "",
          ),
          busNumber: booking.trip.bus.busNumber,
          routeName: booking.trip.route.name,
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
        }}
      />
    </main>
  );
}
