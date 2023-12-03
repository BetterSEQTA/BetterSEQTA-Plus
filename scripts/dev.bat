@echo off
REM Running npm run dev in both directories
cd ..
cd interface
START cmd /k "npm run dev"
cd ..
npm run dev