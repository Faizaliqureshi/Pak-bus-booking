import { NextResponse } from "next/server";
import { getSessionUser, normalizePkPhone } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  title: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  country: true,
  state: true,
  city: true,
  passportNumber: true,
  nicNumber: true,
} as const;

function emptyToNull(value: string | undefined | null): string | null {
  const v = value?.trim() ?? "";
  return v.length > 0 ? v : null;
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Please sign in." },
      { status: 401 },
    );
  }
  return NextResponse.json({ success: true, data: session });
}

export async function PATCH(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Please sign in." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      title?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      day?: string | number;
      month?: string | number;
      year?: string | number;
      country?: string;
      state?: string;
      city?: string;
      passportNumber?: string;
      nicNumber?: string;
    };

    const title = emptyToNull(body.title);
    const firstName = emptyToNull(body.firstName);
    const lastName = emptyToNull(body.lastName);
    const phoneRaw = body.phone?.trim() ?? "";
    const country = emptyToNull(body.country) ?? "Pakistan";
    const state = emptyToNull(body.state);
    const city = emptyToNull(body.city);
    const passportNumber = emptyToNull(body.passportNumber)?.toUpperCase() ?? null;
    const nicNumber = emptyToNull(body.nicNumber);

    if (!firstName || firstName.length < 1) {
      return NextResponse.json(
        { success: false, message: "First & middle name is required." },
        { status: 400 },
      );
    }

    if (phoneRaw && phoneRaw.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid mobile number." },
        { status: 400 },
      );
    }

    if (nicNumber && !/^\d{5}-?\d{7}-?\d$/.test(nicNumber.replace(/\s/g, ""))) {
      // allow 13 digits with or without dashes
      const digits = nicNumber.replace(/\D/g, "");
      if (digits.length !== 13) {
        return NextResponse.json(
          { success: false, message: "NIC must be 13 digits (e.g. 42101-1234567-1)." },
          { status: 400 },
        );
      }
    }

    const day = Number(body.day);
    const month = Number(body.month);
    const year = Number(body.year);
    let dateOfBirth: Date | null = null;
    if (day && month && year) {
      if (year < 1920 || year > new Date().getFullYear() || month < 1 || month > 12 || day < 1 || day > 31) {
        return NextResponse.json(
          { success: false, message: "Please enter a valid date of birth." },
          { status: 400 },
        );
      }
      dateOfBirth = new Date(Date.UTC(year, month - 1, day, 12));
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    const user = await prisma.user.update({
      where: { id: session.id },
      data: {
        title,
        firstName,
        lastName,
        name: fullName,
        phone: phoneRaw ? normalizePkPhone(phoneRaw) : null,
        dateOfBirth,
        country,
        state,
        city,
        passportNumber,
        nicNumber: nicNumber
          ? (() => {
              const d = nicNumber.replace(/\D/g, "");
              if (d.length === 13) {
                return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
              }
              return nicNumber;
            })()
          : null,
      },
      select: PROFILE_SELECT,
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("[PATCH /api/account/profile]", error);
    return NextResponse.json(
      { success: false, message: "Could not update profile." },
      { status: 500 },
    );
  }
}
