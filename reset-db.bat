@echo off
echo.
echo ===================================================
echo DATABASE RESET - THIS WILL DELETE ALL EXISTING DATA
echo ===================================================
echo.
echo This will:
echo 1. Drop all tables in the database
echo 2. Run all migrations from scratch
echo 3. Seed the database with fresh data
echo.

choice /C YN /M "Are you sure you want to continue? (Y/N)"

if errorlevel 2 (
  echo.
  echo Database reset cancelled.
  goto end
)

echo.
echo Resetting database...

echo Step 1: Dropping the database schema...
npx prisma db push --force-reset

echo.
echo Step 2: Running migrations...
npx prisma migrate deploy

echo.
echo Step 3: Seeding the database with fresh data...
npx prisma db seed

echo.
echo ==============================================
echo DATABASE RESET COMPLETE
echo ==============================================
echo.
echo The database has been reset with fresh data.
echo Admin login: admin@motelbooking.com / admin123
echo Customer login: customer@example.com / customer123
echo.

:end
pause
