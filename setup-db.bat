@echo off
echo Running database migrations and seeding...
npx prisma migrate dev
npx prisma db seed
echo Database setup completed!
pause
