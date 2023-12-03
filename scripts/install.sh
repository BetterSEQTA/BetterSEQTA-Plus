#!/bin/bash

# Function to install pnpm
install_pnpm() {
    if ! command -v pnpm >/dev/null 2>&1; then
        npm install -g pnpm
    fi
    pnpm_install
}

# Function to install Node.js and npm
install_npm() {
    # Install NVM (Node Version Manager) and Node.js
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install node
}

# Function to install packages using pnpm
pnpm_install() {
    pnpm install
    cd ./interface
    pnpm install
    cd ..
}

# Function to install packages using npm
npm_install() {
    npm install
    cd ./interface
    npm install
    cd ..
}

cd ..

# Check for npm installation
if ! command -v npm >/dev/null 2>&1; then
    echo "npm is not installed. Installing npm and Node.js..."
    install_npm
fi

# Ask user for package manager preference
echo "npm is installed."
read -p "Do you wish to use pnpm? (y/n) " yn
case $yn in
    [Yy]* ) install_pnpm;;
    [Nn]* ) npm_install;;
    * ) echo "Please answer yes or no."; exit 1;;
esac

echo "Success! All dependencies installed."
