#!/bin/bash

# Running install script
./install.sh

cd ..

# Try to get the version of pnpm
pnpm --version > /dev/null 2>&1

# Check the exit status of the previous command
if [ $? -eq 0 ]; then
    # Running npm run dev in both directories
    cd ./interface
    pnpm run build
    cd ..
    pnpm run build
else
    # Running npm run dev in both directories
    cd ./interface
    npm run build
    cd ..
    npm run build
fi