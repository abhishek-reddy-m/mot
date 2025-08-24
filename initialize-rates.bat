@echo off
echo Initializing rates for all room types for the next 2 years...
node initialize-rates.js
if %ERRORLEVEL% NEQ 0 (
  echo Failed to initialize rates. See error message above.
  pause
  exit /b 1
)
echo Rates initialization completed successfully.
pause
