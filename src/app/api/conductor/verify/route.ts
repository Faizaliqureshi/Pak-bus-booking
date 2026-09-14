import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getConductorUser } from "@/lib/admin-auth";
import { maskCnic, parseTicketQr } from "@/lib/checkout-utils";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface VerifyBody {
  pnr?: string;
  tripId?: string;
  rawQr?: string;
}

function formatBoardedAt(date: Date): string {
  return date.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Karachi",
  });
}

/**
 * POST /api/conductor/verify
 * Scan e-ticket QR or PNR and mark passengers boarded.
 */
export async function POST(request: NextRequest) {
  const conductor = await getConductorUser();
  if (!conductor) {
    return NextResponse.json(
      { valid: false, reason: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    let body: VerifyBody;
    try {
      body = (await request.json()) as VerifyBody;
    } catch {
      return NextResponse.json(
        { valid: false, reason: "Invalid JSON body." },
        { status: 400 },
      );
    }

    let pnr = body.pnr?.trim().toUpperCase() ?? "";
    let tripId = body.tripId?.trim();

    if (body.rawQr?.trim()) {
      const parsed = parseTicketQr(body.rawQr);
      if (!parsed) {
        return NextResponse.json({
          valid: false,
          reason: "Invalid PNR / Ticket Not Found",
        });
      }
      pnr = parsed.pnr;
      tripId = tripId || parsed.tripId;
    }

    if (!pnr) {
      return NextResponse.json(
        { valid: false, reason: "Invalid PNR / Ticket Not Found" },
        { status: 400 },
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { pnr },
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

    if (!booking) {
      return NextResponse.json({
        valid: false,
        reason: "Invalid PNR / Ticket Not Found",
      });
    }

    if (tripId && booking.tripId !== tripId) {
      return NextResponse.json({
        valid: false,
        reason: "Ticket does not belong to this trip",
      });
    }

    if (booking.paymentStatus !== PaymentStatus.PAID) {
      return NextResponse.json({
        valid: false,
        reason: "Ticket Unpaid or Cancelled",
      });
    }

    if (booking.tickets.length === 0) {
      return NextResponse.json({
        valid: false,
        reason: "Invalid PNR / Ticket Not Found",
      });
    }

    const alreadyBoarded = booking.tickets.filter((t) => t.isBoarded);
    if (alreadyBoarded.length === booking.tickets.length) {
      const boardedAt =
        alreadyBoarded
          .map((t) => t.boardedAt)
          .filter((d): d is Date => Boolean(d))
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

      return NextResponse.json({
        valid: false,
        reason: boardedAt
          ? `ALREADY BOARDED AT ${formatBoardedAt(boardedAt)}`
          : "ALREADY SCANNED / DUPLICATE ENTRY ATTEMPT",
        code: "ALREADY_BOARDED",
      });
    }

    const now = new Date();
    await prisma.ticket.updateMany({
      where: { bookingId: booking.id, isBoarded: false },
      data: { isBoarded: true, boardedAt: now },
    });

    const seats = booking.tickets.map((t) => t.seatNumber);
    const boardingStop = booking.tickets[0]?.boardingStop;
    const dropStop = booking.tickets[0]?.dropStop;

    return NextResponse.json({
      valid: true,
      data: {
        pnr: booking.pnr,
        tripId: booking.tripId,
        operatorName: booking.trip.bus.operator.name.replace(
          /\s+Operator$/i,
          "",
        ),
        busNumber: booking.trip.bus.busNumber,
        routeName: booking.trip.route.name,
        seats,
        seatLabel: seats.map((s) => `Seat ${s}`).join(", "),
        passengers: booking.tickets.map((t) => ({
          name: t.passengerName,
          cnic: t.passengerCnic ? maskCnic(t.passengerCnic) : null,
          gender: t.passengerGender,
          seatNumber: t.seatNumber,
        })),
        boardingStop: boardingStop
          ? { id: boardingStop.id, name: boardingStop.stationName }
          : null,
        dropStop: dropStop
          ? { id: dropStop.id, name: dropStop.stationName }
          : null,
        boardedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("[POST /api/conductor/verify]", error);
    return NextResponse.json(
      { valid: false, reason: "Verification failed. Try again." },
      { status: 500 },
    );
  }
}
