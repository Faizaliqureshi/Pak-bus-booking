import { NextResponse } from "next/server";
import { normalizePkPhone } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      companyName?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      city?: string;
      fleetSize?: number | string;
      routesServed?: string;
      message?: string;
    };

    const companyName = body.companyName?.trim() ?? "";
    const contactName = body.contactName?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const phone = body.phone?.trim() ?? "";
    const city = body.city?.trim() ?? "";
    const routesServed = body.routesServed?.trim() ?? "";
    const message = body.message?.trim() || null;
    const fleetSize = Number(body.fleetSize);

    if (companyName.length < 2) {
      return NextResponse.json(
        { success: false, message: "Company / operator name is required." },
        { status: 400 },
      );
    }
    if (contactName.length < 2) {
      return NextResponse.json(
        { success: false, message: "Contact person name is required." },
        { status: 400 },
      );
    }
    if (!isEmail(email)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email." },
        { status: 400 },
      );
    }
    if (phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid phone number." },
        { status: 400 },
      );
    }
    if (city.length < 2) {
      return NextResponse.json(
        { success: false, message: "Head-office city is required." },
        { status: 400 },
      );
    }
    if (!Number.isFinite(fleetSize) || fleetSize < 1) {
      return NextResponse.json(
        { success: false, message: "Fleet size must be at least 1." },
        { status: 400 },
      );
    }
    if (routesServed.length < 3) {
      return NextResponse.json(
        { success: false, message: "Please list the routes you operate." },
        { status: 400 },
      );
    }

    const application = await prisma.partnerApplication.create({
      data: {
        companyName,
        contactName,
        email,
        phone: normalizePkPhone(phone),
        city,
        fleetSize: Math.floor(fleetSize),
        routesServed,
        message,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: { id: application.id, status: application.status },
        message: "Application submitted. Our partnerships team will contact you.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/partner/register]", error);
    return NextResponse.json(
      { success: false, message: "Could not submit partner application." },
      { status: 500 },
    );
  }
}
