-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "subdomain" TEXT;

-- Give existing properties a default subdomain from their name ("Oceanview Resort" -> "oceanview-resort").
-- Names that are too short, reserved or already taken get the end of the property id appended.
WITH slugs AS (
  SELECT
    "id",
    rtrim(left(ltrim(regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'), '-'), 50), '-') AS "slug"
  FROM "properties"
),
ranked AS (
  SELECT "id", "slug", row_number() OVER (PARTITION BY "slug" ORDER BY "id") AS "rank"
  FROM slugs
)
UPDATE "properties" AS p
SET "subdomain" = CASE
  WHEN r."slug" = '' THEN 'hotel-' || right(r."id", 6)
  WHEN r."rank" > 1
    OR length(r."slug") < 3
    OR r."slug" LIKE 'xn--%'
    OR r."slug" IN (
      'www', 'app', 'api', 'admin', 'dashboard', 'login', 'auth', 'account', 'book', 'booking', 'bookings',
      'mail', 'email', 'smtp', 'imap', 'ftp', 'ns1', 'ns2', 'cdn', 'static', 'assets', 'media',
      'help', 'support', 'status', 'docs', 'blog', 'dev', 'staging', 'test', 'demo'
    )
    THEN r."slug" || '-' || right(r."id", 6)
  ELSE r."slug"
END
FROM ranked AS r
WHERE p."id" = r."id";

-- CreateIndex
CREATE UNIQUE INDEX "properties_subdomain_key" ON "properties"("subdomain");
