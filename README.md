![Logo](https://raw.githubusercontent.com/SethBurkart123/EvenBetterSEQTA/master/public/icons/betterseqta-light-full.png#gh-dark-mode-only)
![Logo](https://raw.githubusercontent.com/SethBurkart123/EvenBetterSEQTA/master/public/icons/betterseqta-dark-full.png#gh-light-mode-only)

# BetterSEQTA+

Forking the BetterSEQTA project to add extra functionality
Looking for contributors!

## Table of contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Contributing](#contributing)

## Features

- Dark mode
  - Custom Background
- Improved Styling/CSS
  - Improved look for SEQTA Learn
- Custom Home Page including:
  - Daily Lessons
  - Shortcuts
  - Easier Access Notices
- Options to remove certain items from the side menu
- Notification for next lesson (sent 5 minutes prior to lesson end)
- Browser Support
  - Chrome Supported
  - Edge Supported
  - Brave Supported
  - Opera Supported
  - Firefox (currently not supported, plans for it in future though)

## Getting started

1. Clone the repository

```
git clone https://github.com/SethBurkart123/EvenBetterSEQTA
```

2. Install dependencies

```
npm install
```
OR
```
pnpm install
```
OR
```
yarn install
```

3. Run the dev script (it updates as you save files)

```
npm run dev
```
OR
```
pnpm dev
```
OR
```
yarn dev
```

## Folder Structure

The folder structure is as follows:

- The `public` folder contains files that are not compiled, but only copied across to the build directory

- The `src` folder contains source files that are compiled to the build directory, these can use import statements so that we can do code splitting.

- The `build` folder is where the compiled code ends up, this is the folder what you need to load into chrome as an unpacked extension for development.

## Contributing

If you would like to contribute to this project, please read the [contributing guidelines](CONTRIBUTING.md).

## Credits

This extension was initially developed by [Nulkem](https://github.com/Nulkem/betterseqta), was ported to manifest V3 by [OG-RandomTechChannel](https://github.com/OG-RandomTechChannel) and is currently under active development by [SethBurkart](https://github.com/SethBurkart123)
