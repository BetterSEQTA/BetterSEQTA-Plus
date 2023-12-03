#!/bin/bash

# Running install script
./install.sh

cd ..

# Building projects
cd ./interface
npm run build
cd ..
npm run build