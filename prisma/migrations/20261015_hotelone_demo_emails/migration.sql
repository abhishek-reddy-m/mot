-- StayOS is now HotelOne: move the shared public-demo logins to @hotelone.demo
-- (same people, same passwords and hotels), unless that address already exists.
UPDATE "users" AS u
SET "email" = replace(u."email", '@stayos.demo', '@hotelone.demo')
WHERE u."email" LIKE '%@stayos.demo'
  AND NOT EXISTS (
    SELECT 1 FROM "users" AS v WHERE v."email" = replace(u."email", '@stayos.demo', '@hotelone.demo')
  );
