import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { HOLIDAY_TOURS, type HolidayTour } from "@/lib/holiday-tours";
import { isServiceKind, type ServiceKind } from "@/lib/service-desk";
import { UMRAH_PACKAGES, type UmrahPackage } from "@/lib/umrah-packages";
import { VISA_SERVICES, type VisaService } from "@/lib/visa-services";

export type CatalogPayload = {
  visas?: VisaService[];
  packages?: UmrahPackage[];
  tours?: HolidayTour[];
};

function defaultPayload(kind: ServiceKind): CatalogPayload {
  if (kind === "VISA") return { visas: VISA_SERVICES };
  if (kind === "UMRAH") return { packages: UMRAH_PACKAGES };
  return { tours: HOLIDAY_TOURS };
}

export async function getCatalogPayload(kind: ServiceKind): Promise<CatalogPayload> {
  try {
    const row = await prisma.serviceCatalog.findUnique({ where: { kind } });
    if (!row || !row.payload || typeof row.payload !== "object") {
      return defaultPayload(kind);
    }
    return { ...defaultPayload(kind), ...(row.payload as CatalogPayload) };
  } catch (error) {
    console.warn("[service-catalog] using built-in catalog", error);
    return defaultPayload(kind);
  }
}

export async function saveCatalogPayload(
  kind: ServiceKind,
  payload: CatalogPayload,
): Promise<CatalogPayload> {
  const next = { ...defaultPayload(kind), ...payload };
  const json = next as Prisma.InputJsonValue;
  await prisma.serviceCatalog.upsert({
    where: { kind },
    create: { kind, payload: json },
    update: { payload: json },
  });
  return next;
}

export async function getPublishedVisaServices(): Promise<VisaService[]> {
  const payload = await getCatalogPayload("VISA");
  return payload.visas ?? VISA_SERVICES;
}

export async function getPublishedVisaService(
  slug: string,
): Promise<VisaService | undefined> {
  const visas = await getPublishedVisaServices();
  return visas.find((v) => v.slug === slug);
}

export async function getPublishedUmrahPackages(): Promise<UmrahPackage[]> {
  const payload = await getCatalogPayload("UMRAH");
  return payload.packages ?? UMRAH_PACKAGES;
}

export async function getPublishedHolidayTours(): Promise<HolidayTour[]> {
  const payload = await getCatalogPayload("HOLIDAY");
  return payload.tours ?? HOLIDAY_TOURS;
}

export function parseCatalogKind(value: string): ServiceKind | null {
  const kind = value.trim().toUpperCase();
  return isServiceKind(kind) ? kind : null;
}
