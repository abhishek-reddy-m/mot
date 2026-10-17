-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "customDomainVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customDomainVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "properties_customDomain_key" ON "properties"("customDomain");

