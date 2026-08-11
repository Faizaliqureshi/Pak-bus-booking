import { NextRequest, NextResponse } from "next/server";
import { Gender, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildQrPayload,
  formatCnic,
  isValidCnic,
  isValidEmail,
  isValidPkPhone,
  parseHeldSeats,
  signQrPayload,
  type PaymentMethod,
} from "@/lib/checkout-utils";
import { sendLocalSMS, sendWhatsAppTicket } from "@/lib/notifications";
import { unlockSeat } from "@/lib/redis-lock";

export const runtime = "nodejs";

interface PassengerInput {
  seatNumber: string;
  fullName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  cnic: string;
}

interface ProcessCheckoutBody {
  bookingId: string;
  contactPhone: string;
  contactEmail: string;
  paymentMethod: PaymentMethod;
  passengers: PassengerInput[];
}

const PAYMENT_METHODS = new Set<PaymentMethod>([
  "JAZZCASH",
  "EASYPAISA",
  "CARD",
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * POST /api/checkout/process
 * Validates passengers/CNIC, marks booking PAID, writes tickets, clears locks.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const {
      bookingId,
      contactPhone,
      contactEmail,
      paymentMethod,
      passengers,
    } = (body ?? {}) as Partial<ProcessCheckoutBody>;

    if (!isNonEmptyString(bookingId)) {
      return NextResponse.json(
        { success: false, message: "bookingId is required." },
        { status: 400 },
      );
    }

    if (!isNonEmptyString(contactPhone) || !isValidPkPhone(contactPhone)) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid Pakistani mobile number (e.g. 03001234567).",
        },
        { status: 400 },
      );
    }

    if (!isNonEmptyString(contactEmail) || !isValidEmail(contactEmail)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid email address." },
        { status: 400 },
      );
    }

    if (!paymentMethod || !PAYMENT_METHODS.has(paymentMethod)) {
      return NextResponse.json(
        { success: false, message: "Select a valid payment method." },
        { status: 400 },
      );
    }

    if (!Array.isArray(passengers) || passengers.length === 0) {
      return NextResponse.json(
        { success: false, message: "Passenger details are required." },
        { status: 400 },
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId.trim() },
      include: {
        trip: {
          include: {
            bus: {
              include: {
                operator: { select: { name: true } },
              },
            },
          },
        },
        tickets: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 },
      );
    }

    if (booking.paymentStatus === PaymentStatus.PAID) {
      return NextResponse.json(
        {
          success: true,
          data: { pnr: booking.pnr, ticketUrl: `/ticket/${booking.pnr}` },
          message: "Booking already paid.",
        },
        { status: 200 },
      );
    }

    if (booking.paymentStatus !== PaymentStatus.PENDING) {
      return NextResponse.json(
        { success: false, message: "Booking cannot be paid in its current state." },
        { status: 409 },
      );
    }

    if (booking.lockExpiresAt && booking.lockExpiresAt.getTime() <= Date.now()) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
      return NextResponse.json(
        { success: false, message: "Seat hold expired. Please select seats again." },
        { status: 409 },
      );
    }

    const heldSeats = parseHeldSeats(booking.heldSeats);
    if (heldSeats.length === 0 || !booking.boardingStopId || !booking.dropStopId) {
      return NextResponse.json(
        { success: false, message: "Booking is missing seat hold details." },
        { status: 400 },
      );
    }

    if (passengers.length !== heldSeats.length) {
      return NextResponse.json(
        {
          success: false,
          message: `Expected passenger details for ${heldSeats.length} seat(s).`,
        },
        { status: 400 },
      );
    }

    const normalizedPassengers: Array<{
      seatNumber: string;
      fullName: string;
      gender: Gender;
      cnic: string;
    }> = [];

    const seenSeats = new Set<string>();
    for (const passenger of passengers) {
      if (
        !isNonEmptyString(passenger.seatNumber) ||
        !isNonEmptyString(passenger.fullName) ||
        !isNonEmptyString(passenger.cnic)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Each passenger needs seatNumber, fullName, and cnic.",
          },
          { status: 400 },
        );
      }

      const seatNumber = passenger.seatNumber.trim();
      if (!heldSeats.includes(seatNumber)) {
        return NextResponse.json(
          { success: false, message: `Seat ${seatNumber} is not part of this booking.` },
          { status: 400 },
        );
      }
      if (seenSeats.has(seatNumber)) {
        return NextResponse.json(
          { success: false, message: `Duplicate passenger entry for seat ${seatNumber}.` },
          { status: 400 },
        );
      }
      seenSeats.add(seatNumber);

      if (!["MALE", "FEMALE", "OTHER"].includes(passenger.gender)) {
        return NextResponse.json(
          { success: false, message: `Invalid gender for seat ${seatNumber}.` },
          { status: 400 },
        );
      }

      if (!isValidCnic(passenger.cnic)) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid CNIC for seat ${seatNumber}. Use format 00000-0000000-0.`,
          },
          { status: 400 },
        );
      }

      normalizedPassengers.push({
        seatNumber,
        fullName: passenger.fullName.trim(),
        gender: passenger.gender as Gender,
        cnic: formatCnic(passenger.cnic),
      });
    }

    // Simulate local wallet / card authorization
    if (paymentMethod === "CARD") {
      // Stripe placeholder — treat as authorized in demo mode
    }

    const seatsCsv = heldSeats.join(",");
    const qrPayload = signQrPayload(
      buildQrPayload({
        pnr: booking.pnr,
        tripId: booking.tripId,
        seats: heldSeats,
      }),
    );

    const updated = await prisma.$transaction(async (tx) => {
      if (booking.tickets.length > 0) {
        await tx.ticket.deleteMany({ where: { bookingId: booking.id } });
      }

      await tx.ticket.createMany({
        data: normalizedPassengers.map((p) => ({
          bookingId: booking.id,
          seatNumber: p.seatNumber,
          passengerName: p.fullName,
          passengerGender: p.gender,
          passengerCnic: p.cnic,
          boardingStopId: booking.boardingStopId!,
          dropStopId: booking.dropStopId!,
        })),
      });

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          paymentMethod,
          contactPhone: contactPhone.replace(/[\s-]/g, ""),
          contactEmail: contactEmail.trim().toLowerCase(),
          qrCodeUrl: qrPayload,
          heldSeats: seatsCsv,
        },
      });
    });

    // Release Redis + Prisma seat locks
    await Promise.all(
      heldSeats.map((seat) =>
        unlockSeat(booking.tripId, seat, booking.userId).catch(() => ({
          success: false,
          message: "unlock skipped",
        })),
      ),
    );

    // Notify passenger via WhatsApp + local SMS (non-blocking)
    const [boardingStop, dropStop] = await Promise.all([
      prisma.routeStop.findUnique({
        where: { id: booking.boardingStopId! },
      }),
      prisma.routeStop.findUnique({
        where: { id: booking.dropStopId! },
      }),
    ]);

    const primaryPassenger = normalizedPassengers[0];
    const notificationData = {
      pnr: updated.pnr,
      passengerName: primaryPassenger.fullName,
      passengerPhone: contactPhone.replace(/[\s-]/g, ""),
      busOperator:
        booking.trip.bus.operator.name.replace(/\s+Operator$/i, "") ||
        "Falcon Express",
      seatNumbers: heldSeats,
      boardingTerminal: boardingStop?.stationName ?? "Boarding terminal",
      dropTerminal: dropStop?.stationName ?? "Drop terminal",
      departureTime: new Date(booking.trip.departureTime).toLocaleString(
        "en-PK",
        {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Karachi",
        },
      ),
      totalPricePKR: Number(updated.totalPrice),
    };

    void Promise.allSettled([
      sendWhatsAppTicket(notificationData),
      sendLocalSMS(notificationData),
    ]).then(() => {
      console.log("Ticket notification dispatch complete.");
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          pnr: updated.pnr,
          paymentStatus: updated.paymentStatus,
          paymentMethod: updated.paymentMethod,
          qrCodeUrl: updated.qrCodeUrl,
          ticketUrl: `/ticket/${updated.pnr}`,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[POST /api/checkout/process]", error);
    return NextResponse.json(
      { success: false, message: "Checkout processing failed." },
      { status: 500 },
    );
  }
}
