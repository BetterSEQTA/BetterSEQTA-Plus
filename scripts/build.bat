@echo off
REM Running install script
call install.bat

REM Building projects
cd ..
cd interface
npm run build
cd ..
npm run build