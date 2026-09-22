import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getAdminUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { isServiceKind, servicePrefix } from "@/lib/service-desk";

export const runtime = "nodejs";

function randomRef(kind: string): string {
  const prefix = isServiceKind(kind) ? servicePrefix(kind) : "SV";
  const token = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${token}`;
}

export async function GET(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const kind = (request.nextUrl.searchParams.get("kind") ?? "").toUpperCase();
  if (!isServiceKind(kind)) {
    return NextResponse.json(
      { success: false, message: "Unknown service." },
      { status: 400 },
    );
  }

  try {
    const [inquiries, orders, paidAgg, pendingAgg] = await Promise.all([
      prisma.serviceInquiry.findMany({
        where: { kind },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.serviceOrder.findMany({
        where: { kind },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.serviceOrder.aggregate({
        where: { kind, paymentStatus: PaymentStatus.PAID },
        _sum: { amountPkr: true },
        _count: true,
      }),
      prisma.serviceOrder.aggregate({
        where: { kind, paymentStatus: PaymentStatus.PENDING },
        _sum: { amountPkr: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        finance: {
          paidRevenue: Number(paidAgg._sum.amountPkr ?? 0),
          paidBookings: paidAgg._count,
          pendingValue: Number(pendingAgg._sum.amountPkr ?? 0),
          pendingBookings: pendingAgg._count,
          queries: inquiries.length,
          openQueries: inquiries.filter((i) => i.status === "NEW").length,
        },
        inquiries: inquiries.map((i) => {
          const invoice = orders.find((o) => o.inquiryId === i.id);
          return {
            id: i.id,
            country: i.country,
            name: i.name,
            phone: i.phone,
            notes: i.notes,
            status: i.status,
            createdAt: i.createdAt.toISOString(),
            invoiceId: invoice?.id ?? null,
            invoiceRef: invoice?.reference ?? null,
            invoiceStatus: invoice?.paymentStatus ?? null,
            invoiceAmount: invoice ? Number(invoice.amountPkr) : null,
          };
        }),
        orders: orders.map((o) => ({
          id: o.id,
          inquiryId: o.inquiryId,
          reference: o.reference,
          country: o.country,
          productLabel: o.productLabel,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          amountPkr: Number(o.amountPkr),
          paymentStatus: o.paymentStatus,
          paymentMethod: o.paymentMethod,
          paidAt: o.paidAt?.toISOString() ?? null,
          createdAt: o.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("[GET /api/master/services]", error);
    return NextResponse.json(
      { success: false, message: "Could not load service desk." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as {
      kind?: string;
      inquiryId?: string;
      country?: string;
      productLabel?: string;
      customerName?: string;
      customerPhone?: string;
      amountPkr?: number;
      paymentMethod?: string;
      markPaid?: boolean;
    };

    const kind = (body.kind ?? "").trim().toUpperCase();
    if (!isServiceKind(kind)) {
      return NextResponse.json(
        { success: false, message: "Unknown service." },
        { status: 400 },
      );
    }

    const customerName = body.customerName?.trim() ?? "";
    const customerPhone = body.customerPhone?.trim() ?? "";
    const country = body.country?.trim() ?? "";
    const amountPkr = Number(body.amountPkr);
    if (!customerName || !customerPhone || !country || !Number.isFinite(amountPkr) || amountPkr <= 0) {
      return NextResponse.json(
        { success: false, message: "Name, phone, country, and amount are required." },
        { status: 400 },
      );
    }

    const paid = body.markPaid === true;
    const productLabel = body.productLabel?.trim() || country;
    const paymentMethod = body.paymentMethod?.trim() || null;

    if (body.inquiryId) {
      const existing = await prisma.serviceOrder.findFirst({
        where: { inquiryId: body.inquiryId },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        const alreadyPaid = existing.paymentStatus === PaymentStatus.PAID;
        const order = await prisma.serviceOrder.update({
          where: { id: existing.id },
          data: {
            country,
            productLabel,
            customerName,
            customerPhone,
            amountPkr,
            ...(paid && !alreadyPaid
              ? {
                  paymentStatus: PaymentStatus.PAID,
                  paidAt: new Date(),
                  paymentMethod: paymentMethod || existing.paymentMethod || "DESK",
                }
              : {}),
          },
        });
        if (paid) {
          await prisma.serviceInquiry.update({
            where: { id: body.inquiryId },
            data: { status: "CONVERTED" },
          });
        }
        return NextResponse.json({
          success: true,
          data: {
            id: order.id,
            reference: order.reference,
            paymentStatus: order.paymentStatus,
          },
        });
      }
    }

    const order = await prisma.serviceOrder.create({
      data: {
        kind,
        inquiryId: body.inquiryId || null,
        reference: randomRef(kind),
        country,
        productLabel,
        customerName,
        customerPhone,
        amountPkr,
        paymentStatus: paid ? PaymentStatus.PAID : PaymentStatus.PENDING,
        paymentMethod,
        paidAt: paid ? new Date() : null,
      },
    });

    if (body.inquiryId) {
      await prisma.serviceInquiry.update({
        where: { id: body.inquiryId },
        data: { status: paid ? "CONVERTED" : "CONTACTED" },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: order.id,
          reference: order.reference,
          paymentStatus: order.paymentStatus,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/master/services]", error);
    return NextResponse.json(
      { success: false, message: "Could not record booking." },
      { status: 500 },
    );
  }
}
