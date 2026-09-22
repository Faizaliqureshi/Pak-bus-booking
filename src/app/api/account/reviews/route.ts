import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { clampRating, normalizeReviewComment } from "@/lib/bus-catalog";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function paidOnBus(userId: string, busId: string) {
  return prisma.booking.findFirst({
    where: {
      userId,
      paymentStatus: PaymentStatus.PAID,
      trip: { busId },
    },
    select: { id: true },
  });
}

/** POST /api/account/reviews — create or update stars + review after a paid booking. */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Please sign in." },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as {
      busId?: string;
      rating?: unknown;
      comment?: unknown;
    };
    const busId = String(body.busId ?? "").trim();
    const rating = clampRating(body.rating);
    const comment = normalizeReviewComment(body.comment);

    if (!busId || rating == null) {
      return NextResponse.json(
        { success: false, message: "Choose a bus and a rating from 1 to 5." },
        { status: 400 },
      );
    }

    const eligible = await paidOnBus(user.id, busId);
    if (!eligible) {
      return NextResponse.json(
        {
          success: false,
          message: "Only paid bookings can review this bus.",
        },
        { status: 403 },
      );
    }

    const review = await prisma.busReview.upsert({
      where: { userId_busId: { userId: user.id, busId } },
      create: { userId: user.id, busId, rating, comment },
      update: { rating, comment },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: review.id,
        busId: review.busId,
        rating: review.rating,
        comment: review.comment,
        updatedAt: review.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[POST /api/account/reviews]", error);
    return NextResponse.json(
      { success: false, message: "Could not save review." },
      { status: 500 },
    );
  }
}
