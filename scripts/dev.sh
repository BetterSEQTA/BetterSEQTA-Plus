#!/bin/bash

cd ..

# Try to get the version of pnpm
pnpm --version > /dev/null 2>&1

# Check the exit status of the previous command
if [ $? -eq 0 ]; then
    # Running npm run dev in both directories
    cd ./interface
    pnpm run dev &
    cd ..
    pnpm run dev
else
    # Running npm run dev in both directories
    cd ./interface
    npm run dev &
    cd ..
    npm run dev
fi