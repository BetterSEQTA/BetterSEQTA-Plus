@echo off
setlocal

:: Function to check if a program exists
CALL :check_program_existence npm HAS_NPM
CALL :check_program_existence pnpm HAS_PNPM

:: Checking and installing Node.js and npm if not present
IF "%HAS_NPM%"=="false" (
    ECHO npm is not detected. Please install Node.js from https://nodejs.org/ and rerun this script.
    EXIT /B 1
)

:: Checking and installing pnpm if not present
IF "%HAS_PNPM%"=="false" (
    ECHO pnpm is not detected. Installing pnpm...
    npm install -g pnpm
)

:: Installing dependencies using pnpm
CD ..
pnpm install
CD interface
pnpm install
CD ..

ECHO Success! All dependencies installed.
GOTO :EOF

:: Function to check if a program exists
:check_program_existence
SET "program=%~1"
FOR /F "tokens=*" %%i IN ('where %program% 2^>NUL') DO (SET "%~2=true" & GOTO :EOF)
SET "%~2=false"
GOTO :EOF
