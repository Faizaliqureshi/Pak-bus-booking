import { PaymentStatus } from "@prisma/client";
import { buildBrandedInvoicePdf } from "@/lib/invoice-layout";

export async function buildServiceInvoicePdf(order: {
  reference: string;
  kind: string;
  country: string;
  productLabel: string;
  customerName: string;
  customerPhone: string;
  amountPkr: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  createdAt: Date;
  paidAt: Date | null;
}): Promise<Uint8Array> {
  const paid = order.paymentStatus === PaymentStatus.PAID;
  return buildBrandedInvoicePdf({
    title: paid ? "TAX INVOICE" : "PROFORMA INVOICE",
    reference: order.reference,
    billedName: order.customerName,
    billedPhone: order.customerPhone,
    paid,
    serviceLine: `${order.kind} | ${order.country}`,
    serviceDetail: order.productLabel,
    amountPkr: Number(order.amountPkr),
    issuedAt: order.createdAt,
    paidAt: order.paidAt,
  });
}
