/*
  Warnings:

  - You are about to drop the `room_inventory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "room_inventory" DROP CONSTRAINT "room_inventory_roomTypeId_fkey";

-- AlterTable
ALTER TABLE "room_types" ADD COLUMN     "totalRooms" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "room_inventory";

-- CreateTable
CREATE TABLE "room_type_rates" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_type_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_type_rates_date_idx" ON "room_type_rates"("date");

-- CreateIndex
CREATE UNIQUE INDEX "room_type_rates_roomTypeId_date_key" ON "room_type_rates"("roomTypeId", "date");

-- AddForeignKey
ALTER TABLE "room_type_rates" ADD CONSTRAINT "room_type_rates_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
