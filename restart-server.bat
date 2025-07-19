@echo off
echo Restarting Next.js server with room availability updates...

:: Stop any running Next.js server (you might need to customize this)
taskkill /IM node.exe /F

:: Start the development server
npm run dev
