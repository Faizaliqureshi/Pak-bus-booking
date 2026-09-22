import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isServiceKind } from "@/lib/service-desk";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      kind?: string;
      country?: string | null;
      name?: string;
      phone?: string;
      notes?: string;
    };

    const kind = (body.kind ?? "").trim().toUpperCase();
    if (!isServiceKind(kind)) {
      return NextResponse.json(
        { success: false, message: "Unknown service." },
        { status: 400 },
      );
    }

    const name = body.name?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: "Name and mobile are required." },
        { status: 400 },
      );
    }

    const inquiry = await prisma.serviceInquiry.create({
      data: {
        kind,
        country: body.country?.trim() || null,
        name,
        phone,
        notes: body.notes?.trim() || null,
      },
    });

    return NextResponse.json(
      { success: true, data: { id: inquiry.id } },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/services/inquiries]", error);
    return NextResponse.json(
      { success: false, message: "Could not save inquiry." },
      { status: 500 },
    );
  }
}
