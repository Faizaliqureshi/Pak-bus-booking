-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "boardingStopId" TEXT;
ALTER TABLE "bookings" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "bookings" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "bookings" ADD COLUMN "dropStopId" TEXT;
ALTER TABLE "bookings" ADD COLUMN "heldSeats" TEXT;
ALTER TABLE "bookings" ADD COLUMN "lockExpiresAt" DATETIME;
ALTER TABLE "bookings" ADD COLUMN "paymentMethod" TEXT;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN "passengerCnic" TEXT;
