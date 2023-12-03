#!/bin/bash

cd ..

# Running npm run dev in both directories
cd ./interface
npm run dev &
cd ..
npm run dev