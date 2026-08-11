import { NextRequest, NextResponse } from "next/server";
import { Gender, PaymentStatus } from "@prisma/client";
import { getAdminUser } from "@/lib/admin-auth";
import {
  buildQrPayload,
  formatCnic,
  generatePnr,
  isValidCnic,
  isValidPkPhone,
  signQrPayload,
} from "@/lib/checkout-utils";
import { isSegmentOverlapping } from "@/lib/seat-availability";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * POST /api/admin/walk-in
 * Counter staff creates a PAID walk-in ticket for an available seat.
 */
export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const tripId = String(body.tripId ?? "").trim();
    const seatNumber = String(body.seatNumber ?? "").trim();
    const passengerName = String(body.passengerName ?? "").trim();
    const gender = String(body.gender ?? "").trim().toUpperCase();
    const cnic = String(body.cnic ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const boardingStopId = String(body.boardingStopId ?? "").trim();
    const dropStopId = String(body.dropStopId ?? "").trim();

    if (
      !tripId ||
      !seatNumber ||
      !passengerName ||
      !boardingStopId ||
      !dropStopId
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required walk-in fields." },
        { status: 400 },
      );
    }

    if (!["MALE", "FEMALE", "OTHER"].includes(gender)) {
      return NextResponse.json(
        { success: false, message: "Invalid gender." },
        { status: 400 },
      );
    }

    if (!isValidCnic(cnic)) {
      return NextResponse.json(
        { success: false, message: "Invalid CNIC format." },
        { status: 400 },
      );
    }

    if (!isValidPkPhone(phone)) {
      return NextResponse.json(
        { success: false, message: "Invalid phone (e.g. 03001234567)." },
        { status: 400 },
      );
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bus: true,
        route: { include: { stops: true } },
      },
    });

    if (!trip) {
      return NextResponse.json(
        { success: false, message: "Trip not found." },
        { status: 404 },
      );
    }

    const seatNum = Number(seatNumber);
    if (!Number.isInteger(seatNum) || seatNum < 1 || seatNum > trip.bus.totalSeats) {
      return NextResponse.json(
        { success: false, message: "Seat number out of range." },
        { status: 400 },
      );
    }

    const boarding = trip.route.stops.find((s) => s.id === boardingStopId);
    const drop = trip.route.stops.find((s) => s.id === dropStopId);
    if (!boarding || !drop || boarding.stopOrder >= drop.stopOrder) {
      return NextResponse.json(
        { success: false, message: "Invalid boarding/drop stops." },
        { status: 400 },
      );
    }

    const existingTickets = await prisma.ticket.findMany({
      where: {
        seatNumber,
        booking: { tripId, paymentStatus: PaymentStatus.PAID },
      },
      include: { boardingStop: true, dropStop: true },
    });

    const conflict = existingTickets.some((t) =>
      isSegmentOverlapping(
        boarding.stopOrder,
        drop.stopOrder,
        t.boardingStop.stopOrder,
        t.dropStop.stopOrder,
      ),
    );

    if (conflict) {
      return NextResponse.json(
        { success: false, message: "Seat unavailable for this segment." },
        { status: 409 },
      );
    }

    let pnr = generatePnr();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.booking.findUnique({ where: { pnr } });
      if (!exists) break;
      pnr = generatePnr();
    }

    const totalPrice = Number(trip.basePrice);
    const qr = signQrPayload(
      buildQrPayload({ pnr, tripId, seats: [seatNumber] }),
    );

    const booking = await prisma.booking.create({
      data: {
        pnr,
        userId: admin.id,
        tripId,
        totalPrice,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: "WALK_IN",
        contactPhone: phone.replace(/[\s-]/g, ""),
        contactEmail: admin.email,
        qrCodeUrl: qr,
        heldSeats: seatNumber,
        boardingStopId,
        dropStopId,
        tickets: {
          create: {
            seatNumber,
            passengerName,
            passengerGender: gender as Gender,
            passengerCnic: formatCnic(cnic),
            boardingStopId,
            dropStopId,
          },
        },
      },
      include: { tickets: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          bookingId: booking.id,
          pnr: booking.pnr,
          ticketUrl: `/ticket/${booking.pnr}`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/admin/walk-in]", error);
    return NextResponse.json(
      { success: false, message: "Walk-in booking failed." },
      { status: 500 },
    );
  }
}
