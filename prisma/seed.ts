import {
  Gender,
  PaymentStatus,
  PrismaClient,
  TripSeatStatus,
  UserRole,
} from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

async function clearDatabase() {
  await prisma.ticket.deleteMany();
  await prisma.tripSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.seatLock.deleteMany();
  await prisma.paymentGateway.deleteMany();
  await prisma.rewardTransaction.deleteMany();
  await prisma.rewardsAccount.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.partnerApplication.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.routeStop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("Clearing existing data...");
  await clearDatabase();

  console.log("Seeding Pakistani bus booking demo data...");

  const master = await prisma.user.create({
    data: {
      email: "master@ticketpass.pk",
      passwordHash: hashPassword("password123"),
      name: "TicketPass Master",
      phone: "+923001110000",
      role: UserRole.MASTER,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@ticketpass.pk",
      passwordHash: hashPassword("password123"),
      name: "Platform Staff",
      phone: "+923001110001",
      role: UserRole.ADMIN,
      createdById: master.id,
    },
  });

  const operator = await prisma.user.create({
    data: {
      email: "partner@ticketpass.pk",
      passwordHash: hashPassword("password123"),
      name: "Daewoo Partner Ops",
      phone: "+923001110002",
      role: UserRole.OPERATOR,
      createdById: admin.id,
    },
  });

  await prisma.user.create({
    data: {
      email: "conductor@ticketpass.pk",
      passwordHash: hashPassword("password123"),
      name: "Coach Conductor",
      phone: "+923001110003",
      role: UserRole.CONDUCTOR,
      createdById: operator.id,
    },
  });

  const passenger = await prisma.user.create({
    data: {
      email: "ali.khan@example.pk",
      passwordHash: hashPassword("password123"),
      name: "Ali Khan",
      phone: "+923334445566",
      role: UserRole.PASSENGER,
    },
  });

  const bus = await prisma.bus.create({
    data: {
      operatorId: operator.id,
      busNumber: "DAEWOO-786",
      layoutType: "2x2",
      totalSeats: 40,
    },
  });

  await prisma.paymentGateway.createMany({
    data: [
      {
        name: "JazzCash",
        gatewayType: "JAZZCASH",
        flatFee: 0,
        percentageFee: 1.5,
        isActive: true,
      },
      {
        name: "Easypaisa",
        gatewayType: "EASYPAISA",
        flatFee: 0,
        percentageFee: 1.5,
        isActive: true,
      },
      {
        name: "Card",
        gatewayType: "CARD",
        flatFee: 25,
        percentageFee: 2.5,
        isActive: true,
      },
      {
        name: "1Bill",
        gatewayType: "ONEBILL",
        flatFee: 0,
        percentageFee: 1.0,
        isActive: true,
      },
    ],
  });

  const jazzCash = await prisma.paymentGateway.findUniqueOrThrow({
    where: { gatewayType: "JAZZCASH" },
  });

  const route = await prisma.route.create({
    data: {
      name: "Karachi to Lahore Express",
      originCity: "Karachi",
      destinationCity: "Lahore",
      distanceKm: 1260,
      baseFare: 4500,
      stops: {
        create: [
          {
            stationName: "Karachi Sohrab Goth Terminal",
            stopOrder: 1,
            distanceFromOrigin: 0,
          },
          {
            stationName: "Hyderabad Bypass Terminal",
            stopOrder: 2,
            distanceFromOrigin: 165,
          },
          {
            stationName: "Sukkur Bypass Terminal",
            stopOrder: 3,
            distanceFromOrigin: 475,
          },
          {
            stationName: "Multan General Bus Stand",
            stopOrder: 4,
            distanceFromOrigin: 880,
          },
          {
            stationName: "Lahore Thokar Niaz Baig Terminal",
            stopOrder: 5,
            distanceFromOrigin: 1260,
          },
        ],
      },
    },
    include: { stops: { orderBy: { stopOrder: "asc" } } },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(15, 0, 0, 0);
  const arrival = new Date(tomorrow);
  arrival.setHours(arrival.getHours() + 18);

  const trip = await prisma.trip.create({
    data: {
      busId: bus.id,
      routeId: route.id,
      departureTime: tomorrow,
      arrivalTime: arrival,
      basePrice: 4500,
    },
  });

  await prisma.tripSeat.createMany({
    data: Array.from({ length: bus.totalSeats }, (_, i) => ({
      tripId: trip.id,
      seatNumber: String(i + 1),
      status: TripSeatStatus.AVAILABLE,
    })),
  });

  const boarding = route.stops[0]!;
  const drop = route.stops[route.stops.length - 1]!;

  const booking = await prisma.booking.create({
    data: {
      pnr: "PKR-8921A",
      userId: passenger.id,
      tripId: trip.id,
      totalPrice: 4500,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: "JAZZCASH",
      paymentGatewayId: jazzCash.id,
      contactPhone: passenger.phone,
      contactEmail: passenger.email,
      tickets: {
        create: [
          {
            seatNumber: "12",
            passengerName: "Ali Khan",
            passengerGender: Gender.MALE,
            passengerCnic: "42101-1234567-1",
            boardingStopId: boarding.id,
            dropStopId: drop.id,
          },
        ],
      },
    },
  });

  await prisma.tripSeat.update({
    where: {
      tripId_seatNumber: { tripId: trip.id, seatNumber: "12" },
    },
    data: {
      status: TripSeatStatus.BOOKED,
      bookingId: booking.id,
    },
  });

  console.log("Seed complete.");
  console.log("Master:     master@ticketpass.pk / password123  → /master");
  console.log("Partner:    partner@ticketpass.pk / password123 → /partner/fleet");
  console.log("Conductor:  conductor@ticketpass.pk / password123 → /conductor");
  console.log("Passenger:  ali.khan@example.pk / password123 → /auth/sign-in");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
