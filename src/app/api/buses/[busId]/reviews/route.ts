import { NextResponse } from "next/server";
import { averageRating } from "@/lib/bus-catalog";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ busId: string }> };

/** GET /api/buses/:busId/reviews — public passenger reviews for a coach. */
export async function GET(_request: Request, context: RouteContext) {
  const { busId } = await context.params;
  const reviews = await prisma.busReview.findMany({
    where: { busId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...averageRating(reviews.map((r) => r.rating)),
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        name: r.user.name,
        updatedAt: r.updatedAt.toISOString(),
      })),
    },
  });
}
