@echo off
echo Building the Next.js application...
echo.

echo Step 1: Installing dependencies if needed...
call npm install
echo.

echo Step 2: Running ESLint with fixed configuration...
call npx eslint --fix --ext .js,.jsx,.ts,.tsx ./src
echo.

echo Step 3: Building the application...
call npm run build
echo.

echo Build process completed.
pause
