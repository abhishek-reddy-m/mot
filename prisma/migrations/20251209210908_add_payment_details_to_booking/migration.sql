-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "billingName" TEXT,
ADD COLUMN     "billingZip" TEXT,
ADD COLUMN     "cardBrand" TEXT,
ADD COLUMN     "cardExpMonth" INTEGER,
ADD COLUMN     "cardExpYear" INTEGER,
ADD COLUMN     "cardLast4" TEXT;
