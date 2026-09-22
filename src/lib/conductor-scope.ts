import { prisma } from "@/lib/prisma";

/** Partner the conductor works under (`User.createdById`). */
export function partnerIdForConductor(
  conductor: { createdById?: string | null },
): string | null {
  return conductor.createdById ?? null;
}

export function conductorFleetWhere(
  partnerId: string | null,
): { bus: { operatorId: string } } | { id: string } {
  if (!partnerId) return { id: "__unassigned_conductor__" };
  return { bus: { operatorId: partnerId } };
}

export async function conductorOwnsTrip(
  conductor: { createdById?: string | null },
  tripId: string,
): Promise<boolean> {
  const partnerId = partnerIdForConductor(conductor);
  if (!partnerId) return false;
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, bus: { operatorId: partnerId } },
    select: { id: true },
  });
  return Boolean(trip);
}

export async function conductorOwnsBusNumber(
  conductor: { createdById?: string | null },
  busNumber: string,
): Promise<boolean> {
  const partnerId = partnerIdForConductor(conductor);
  if (!partnerId) return false;
  const bus = await prisma.bus.findFirst({
    where: {
      operatorId: partnerId,
      busNumber: { equals: busNumber, mode: "insensitive" },
    },
    select: { id: true },
  });
  return Boolean(bus);
}
