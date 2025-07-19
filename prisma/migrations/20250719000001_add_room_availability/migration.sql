-- CreateTable
CREATE TABLE "room_availabilities" (
  "id" TEXT NOT NULL,
  "roomTypeId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "totalRooms" INTEGER NOT NULL,
  "bookedRooms" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "room_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_availabilities_roomTypeId_date_key" ON "room_availabilities"("roomTypeId", "date");

-- CreateIndex
CREATE INDEX "room_availabilities_date_idx" ON "room_availabilities"("date");

-- AddForeignKey
ALTER TABLE "room_availabilities" ADD CONSTRAINT "room_availabilities_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
