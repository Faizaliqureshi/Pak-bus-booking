import { isAllowedBusLayoutType } from "@/lib/booking-utils";
import { prisma } from "@/lib/prisma";
import { provisionTripSeats } from "@/lib/trip-inventory";

export class PartnerInventoryError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = "PartnerInventoryError";
  }
}

export type PartnerStopInput = {
  stationName: string;
  stopOrder: number;
  distanceFromOrigin: number;
};

export type LivePublishInput = {
  bus: {
    busId?: string;
    busNumber?: string;
    layoutType?: string;
    totalSeats?: number;
    externalId?: string;
  };
  route: {
    routeId?: string;
    name: string;
    originCity: string;
    destinationCity: string;
    distanceKm: number;
    baseFare?: number;
    stops?: PartnerStopInput[];
    externalId?: string;
  };
  trip: {
    departureTime: Date;
    arrivalTime: Date;
    basePrice: number;
    externalId?: string;
  };
};

const tripInclude = {
  bus: {
    select: {
      id: true,
      busNumber: true,
      layoutType: true,
      totalSeats: true,
      externalId: true,
    },
  },
  route: {
    include: { stops: { orderBy: { stopOrder: "asc" as const } } },
  },
} as const;

function defaultStops(
  originCity: string,
  destinationCity: string,
  distanceKm: number,
): PartnerStopInput[] {
  return [
    {
      stationName: `${originCity} Terminal`,
      stopOrder: 1,
      distanceFromOrigin: 0,
    },
    {
      stationName: `${destinationCity} Terminal`,
      stopOrder: 2,
      distanceFromOrigin: distanceKm,
    },
  ];
}

async function resolveBus(
  operatorId: string,
  input: LivePublishInput["bus"],
) {
  if (input.busId) {
    const bus = await prisma.bus.findFirst({
      where: { id: input.busId, operatorId },
    });
    if (!bus) {
      throw new PartnerInventoryError("Bus not found in your fleet.", 404);
    }
    return { bus, created: false };
  }

  if (input.externalId) {
    const existing = await prisma.bus.findFirst({
      where: { operatorId, externalId: input.externalId },
    });
    const busNumber = input.busNumber?.trim().toUpperCase();
    const layoutType = input.layoutType?.trim();
    const totalSeats = input.totalSeats;
    if (existing) {
      if (
        busNumber ||
        (layoutType && isAllowedBusLayoutType(layoutType)) ||
        (typeof totalSeats === "number" && Number.isInteger(totalSeats))
      ) {
        const updated = await prisma.bus.update({
          where: { id: existing.id },
          data: {
            ...(busNumber ? { busNumber } : {}),
            ...(layoutType && isAllowedBusLayoutType(layoutType)
              ? { layoutType }
              : {}),
            ...(typeof totalSeats === "number" && Number.isInteger(totalSeats)
              ? { totalSeats }
              : {}),
          },
        });
        return { bus: updated, created: false };
      }
      return { bus: existing, created: false };
    }
  }

  const busNumber = input.busNumber?.trim().toUpperCase();
  if (!busNumber) {
    throw new PartnerInventoryError(
      "busNumber or busId is required to go live.",
    );
  }

  const byNumber = await prisma.bus.findFirst({
    where: { operatorId, busNumber },
  });
  if (byNumber) return { bus: byNumber, created: false };

  const layoutType = input.layoutType?.trim() || "2x2";
  const totalSeats = input.totalSeats ?? 40;
  if (!isAllowedBusLayoutType(layoutType)) {
    throw new PartnerInventoryError(
      "layoutType must be 2x2, 2x1, or 2x1_SLEEPER.",
    );
  }
  if (!Number.isInteger(totalSeats) || totalSeats < 1) {
    throw new PartnerInventoryError("totalSeats must be a positive integer.");
  }

  try {
    const created = await prisma.bus.create({
      data: {
        operatorId,
        busNumber,
        layoutType,
        totalSeats,
        externalId: input.externalId ?? null,
      },
    });
    return { bus: created, created: true };
  } catch {
    throw new PartnerInventoryError("Bus number may already exist.", 409);
  }
}

async function resolveRoute(
  operatorId: string,
  input: LivePublishInput["route"],
) {
  const name = input.name.trim();
  const originCity = input.originCity.trim();
  const destinationCity = input.destinationCity.trim();
  const distanceKm = input.distanceKm;
  const baseFare = Number.isFinite(input.baseFare) ? Number(input.baseFare) : 0;
  const stops =
    input.stops && input.stops.length >= 2
      ? input.stops
      : defaultStops(originCity, destinationCity, distanceKm);

  if (!name || !originCity || !destinationCity || !Number.isFinite(distanceKm)) {
    throw new PartnerInventoryError(
      "name, originCity, destinationCity, and distanceKm are required.",
    );
  }
  if (originCity === destinationCity) {
    throw new PartnerInventoryError(
      "originCity and destinationCity must be different.",
    );
  }

  if (input.routeId) {
    const route = await prisma.route.findFirst({
      where: {
        id: input.routeId,
        OR: [{ operatorId }, { operatorId: null }],
      },
      include: { stops: { orderBy: { stopOrder: "asc" } } },
    });
    if (!route) {
      throw new PartnerInventoryError("Route not found.", 404);
    }
    return { route, created: false };
  }

  if (input.externalId) {
    const existing = await prisma.route.findFirst({
      where: { operatorId, externalId: input.externalId },
    });
    if (existing) {
      const updated = await prisma.route.update({
        where: { id: existing.id },
        data: {
          name,
          originCity,
          destinationCity,
          distanceKm,
          baseFare,
          stops: { deleteMany: {}, create: stops },
        },
        include: { stops: { orderBy: { stopOrder: "asc" } } },
      });
      return { route: updated, created: false };
    }
  }

  const sameCorridor = await prisma.route.findFirst({
    where: { operatorId, name, originCity, destinationCity },
    include: { stops: { orderBy: { stopOrder: "asc" } } },
  });
  if (sameCorridor) return { route: sameCorridor, created: false };

  const created = await prisma.route.create({
    data: {
      name,
      originCity,
      destinationCity,
      distanceKm,
      baseFare,
      operatorId,
      externalId: input.externalId ?? null,
      stops: { create: stops },
    },
    include: { stops: { orderBy: { stopOrder: "asc" } } },
  });
  return { route: created, created: true };
}

/** Create or reuse a coach + corridor, then publish a searchable departure. */
export async function publishPartnerLive(
  operatorId: string,
  input: LivePublishInput,
) {
  const { departureTime, arrivalTime, basePrice } = input.trip;
  if (
    Number.isNaN(departureTime.getTime()) ||
    Number.isNaN(arrivalTime.getTime()) ||
    arrivalTime <= departureTime
  ) {
    throw new PartnerInventoryError(
      "departureTime and arrivalTime are required (arrival after departure).",
    );
  }
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new PartnerInventoryError("basePrice must be a number.");
  }

  const { bus, created: busCreated } = await resolveBus(operatorId, input.bus);
  const { route, created: routeCreated } = await resolveRoute(
    operatorId,
    input.route,
  );

  if (input.trip.externalId) {
    const existing = await prisma.trip.findFirst({
      where: { busId: bus.id, externalId: input.trip.externalId },
    });
    if (existing) {
      const updated = await prisma.trip.update({
        where: { id: existing.id },
        data: {
          routeId: route.id,
          departureTime,
          arrivalTime,
          basePrice,
        },
        include: tripInclude,
      });
      await provisionTripSeats(updated.id);
      return {
        bus,
        route,
        trip: updated,
        created: { bus: busCreated, route: routeCreated, trip: false },
      };
    }
  }

  const trip = await prisma.trip.create({
    data: {
      busId: bus.id,
      routeId: route.id,
      departureTime,
      arrivalTime,
      basePrice,
      externalId: input.trip.externalId ?? null,
    },
    include: tripInclude,
  });
  await provisionTripSeats(trip.id);

  return {
    bus,
    route,
    trip,
    created: { bus: busCreated, route: routeCreated, trip: true },
  };
}

export function serializeLiveResult(result: Awaited<ReturnType<typeof publishPartnerLive>>) {
  return {
    live: true,
    created: result.created,
    bus: {
      id: result.bus.id,
      busNumber: result.bus.busNumber,
      layoutType: result.bus.layoutType,
      totalSeats: result.bus.totalSeats,
      externalId: result.bus.externalId,
    },
    route: {
      id: result.route.id,
      name: result.route.name,
      originCity: result.route.originCity,
      destinationCity: result.route.destinationCity,
      distanceKm: result.route.distanceKm,
      baseFare: Number(result.route.baseFare),
      externalId: result.route.externalId,
      stops: result.route.stops.map((s) => ({
        id: s.id,
        stationName: s.stationName,
        stopOrder: s.stopOrder,
        distanceFromOrigin: s.distanceFromOrigin,
      })),
    },
    trip: {
      id: result.trip.id,
      departureTime: result.trip.departureTime.toISOString(),
      arrivalTime: result.trip.arrivalTime.toISOString(),
      basePrice: Number(result.trip.basePrice),
      externalId: result.trip.externalId,
    },
  };
}
