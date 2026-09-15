import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePayable, roundMoney } from "@/lib/payment-fees";

export const runtime = "nodejs";

/**
 * GET /api/payment/calculate-fees?bookingId=
 *
 * Returns active PaymentGateway quotes for a booking, sorted by
 * total payable (lowest first). Formula:
 * total = baseFare + flatFee + (baseFare * percentageFee / 100)
 */
export async function GET(request: NextRequest) {
  try {
    const bookingId = request.nextUrl.searchParams.get("bookingId")?.trim();

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "bookingId is required." },
        { status: 400 },
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        pnr: true,
        totalPrice: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 },
      );
    }

    const gateways = await prisma.paymentGateway.findMany({
      where: { isActive: true },
    });

    const baseFare = Number(booking.totalPrice);
    const channels = gateways
      .map((gateway) => {
        const quote = calculatePayable(
          baseFare,
          Number(gateway.flatFee),
          Number(gateway.percentageFee),
        );
        return {
          id: gateway.id,
          name: gateway.name,
          gatewayType: gateway.gatewayType,
          flatFee: quote.flatFee,
          percentageFee: quote.percentageFee,
          percentageAmount: quote.percentageAmount,
          totalPayable: quote.totalPayable,
        };
      })
      .sort((a, b) => {
        const byTotal = a.totalPayable - b.totalPayable;
        if (byTotal !== 0) return byTotal;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({
      success: true,
      data: {
        bookingId: booking.id,
        pnr: booking.pnr,
        baseFare: roundMoney(baseFare),
        channels,
      },
    });
  } catch (error) {
    console.error("[GET /api/payment/calculate-fees]", error);
    return NextResponse.json(
      { success: false, message: "Failed to calculate payment fees." },
      { status: 500 },
    );
  }
}
