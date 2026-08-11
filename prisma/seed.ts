import {
  Gender,
  PaymentStatus,
  PrismaClient,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

/** Placeholder hash — replace with bcrypt in auth flows */
const DEMO_PASSWORD_HASH =
  "$2b$10$demo.hash.replace.with.bcrypt.in.productionxx";

async function clearDatabase() {
  // Child → parent order respects foreign keys
  await prisma.ticket.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.seatLock.deleteMany();
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

  const operator = await prisma.user.create({
    data: {
      email: "operator@daewoo.pk",
      passwordHash: DEMO_PASSWORD_HASH,
      name: "Daewoo Express Operator",
      phone: "+923001112233",
      role: UserRole.OPERATOR,
    },
  });

  const passenger = await prisma.user.create({
    data: {
      email: "ali.khan@example.pk",
      passwordHash: DEMO_PASSWORD_HASH,
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

  const route = await prisma.route.create({
    data: {
      name: "Karachi to Lahore Express",
      originCity: "Karachi",
      destinationCity: "Lahore",
      distanceKm: 1260,
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
            stationName: "Multan Vehari Chowk Terminal",
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

  const karachiStop = route.stops.find((s) => s.stopOrder === 1)!;
  const sukkurStop = route.stops.find((s) => s.stopOrder === 3)!;

  const departureTime = new Date();
  departureTime.setDate(departureTime.getDate() + 1);
  // 6:00 PM Pakistan Standard Time
  const [y, m, d] = [
    departureTime.getFullYear(),
    String(departureTime.getMonth() + 1).padStart(2, "0"),
    String(departureTime.getDate()).padStart(2, "0"),
  ];
  const departurePkt = new Date(`${y}-${m}-${d}T18:00:00+05:00`);
  const arrivalPkt = new Date(departurePkt.getTime() + 18 * 60 * 60 * 1000);

  const trip = await prisma.trip.create({
    data: {
      busId: bus.id,
      routeId: route.id,
      departureTime: departurePkt,
      arrivalTime: arrivalPkt,
      basePrice: 4500.0,
    },
  });

  // Sample booking: Ali Khan, Seat 12, Karachi → Sukkur (partial segment)
  const booking = await prisma.booking.create({
    data: {
      pnr: "PKR-8921A",
      userId: passenger.id,
      tripId: trip.id,
      totalPrice: 2800.0,
      paymentStatus: PaymentStatus.PAID,
      qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?data=PKR-8921A",
      tickets: {
        create: {
          seatNumber: "12",
          passengerName: "Ali Khan",
          passengerGender: Gender.MALE,
          boardingStopId: karachiStop.id,
          dropStopId: sukkurStop.id,
        },
      },
    },
    include: { tickets: true },
  });

  console.log("Seed complete:");
  console.log({
    operator: { id: operator.id, name: operator.name },
    passenger: { id: passenger.id, name: passenger.name },
    bus: { id: bus.id, busNumber: bus.busNumber },
    route: {
      id: route.id,
      name: route.name,
      stops: route.stops.map((s) => `${s.stopOrder}. ${s.stationName}`),
    },
    trip: {
      id: trip.id,
      departureTime: trip.departureTime.toISOString(),
      basePricePKR: Number(trip.basePrice),
    },
    sampleBooking: {
      pnr: booking.pnr,
      seat: booking.tickets[0]?.seatNumber,
      segment: "Karachi → Sukkur",
      paymentStatus: booking.paymentStatus,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
