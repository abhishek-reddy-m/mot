@echo off
echo.
echo ===================================================
echo DATABASE RESET - THIS WILL DELETE ALL EXISTING DATA
echo ===================================================
echo.
echo This will:
echo 1. Reset the database and keep the schema
echo 2. Run the fixed seed script to add fresh data
echo.

choice /C YN /M "Are you sure you want to continue? (Y/N)"

if errorlevel 2 (
  echo.
  echo Database reset cancelled.
  goto end
)

echo.
echo Resetting database...

echo Step 1: Copying fixed seed file...
copy /Y prisma\seed.fixed.js prisma\seed.js

echo.
echo Step 2: Running seed script (this will clear all data and create fresh data)...
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
