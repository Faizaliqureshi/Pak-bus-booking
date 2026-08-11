-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "seatNumber" TEXT NOT NULL,
    "passengerName" TEXT NOT NULL,
    "passengerGender" TEXT NOT NULL,
    "passengerCnic" TEXT,
    "boardingStopId" TEXT NOT NULL,
    "dropStopId" TEXT NOT NULL,
    "isBoarded" BOOLEAN NOT NULL DEFAULT false,
    "boardedAt" DATETIME,
    CONSTRAINT "tickets_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tickets_boardingStopId_fkey" FOREIGN KEY ("boardingStopId") REFERENCES "route_stops" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tickets_dropStopId_fkey" FOREIGN KEY ("dropStopId") REFERENCES "route_stops" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_tickets" ("boardingStopId", "bookingId", "dropStopId", "id", "passengerCnic", "passengerGender", "passengerName", "seatNumber") SELECT "boardingStopId", "bookingId", "dropStopId", "id", "passengerCnic", "passengerGender", "passengerName", "seatNumber" FROM "tickets";
DROP TABLE "tickets";
ALTER TABLE "new_tickets" RENAME TO "tickets";
CREATE INDEX "tickets_bookingId_idx" ON "tickets"("bookingId");
CREATE INDEX "tickets_boardingStopId_idx" ON "tickets"("boardingStopId");
CREATE INDEX "tickets_dropStopId_idx" ON "tickets"("dropStopId");
CREATE INDEX "tickets_isBoarded_idx" ON "tickets"("isBoarded");
CREATE UNIQUE INDEX "tickets_bookingId_seatNumber_key" ON "tickets"("bookingId", "seatNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
