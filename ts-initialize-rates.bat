@echo off
echo Initializing rates for all room types for the next 2 years...
echo This might take a moment as it needs to install ts-node if not already present...

:: Check if ts-node is installed
call npx ts-node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Installing ts-node...
  call npm install --no-save ts-node typescript @types/node
)

:: Run the script
call node ts-initialize-rates.js
if %ERRORLEVEL% NEQ 0 (
  echo Failed to initialize rates. See error message above.
  pause
  exit /b 1
)
echo Rates initialization completed successfully.
pause
