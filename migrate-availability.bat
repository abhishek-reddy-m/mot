@echo off
echo Running Room Availability Migration...

:: Apply schema changes first
npx prisma migrate dev --name add_room_availability

:: Then run the custom migration script to populate data
node prisma/migrations/20250719000001_add_room_availability/migrate-data.js

echo Migration Complete!
