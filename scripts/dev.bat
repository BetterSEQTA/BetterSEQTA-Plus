@echo off

cd ..

REM Try to get the version of pnpm
pnpm --version >nul 2>&1

REM Check the exit status of the previous command
if %ERRORLEVEL% == 0 (
    REM Running pnpm run dev in both directories
    cd interface
    start /b pnpm run dev
    cd ..
    pnpm run dev
) else (
    REM Running npm run dev in both directories
    cd interface
    start /b npm run dev
    cd ..
    npm run dev
)
