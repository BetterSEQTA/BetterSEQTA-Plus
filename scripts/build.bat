@echo off

REM Running install script
call install.bat

cd ..

REM Try to get the version of pnpm
pnpm --version > NUL 2>&1

REM Check the exit status of the previous command
IF %ERRORLEVEL% EQU 0 (
    REM Running pnpm run build in both directories
    cd ./interface
    pnpm run build
    cd ..
    pnpm run build
) ELSE (
    REM Running npm run build in both directories
    cd ./interface
    npm run build
    cd ..
    npm run build
)
