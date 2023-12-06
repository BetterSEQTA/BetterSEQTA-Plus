![Logo](https://raw.githubusercontent.com/SethBurkart123/EvenBetterSEQTA/master/public/icons/betterseqta-light-full.png#gh-dark-mode-only)
![Logo](https://raw.githubusercontent.com/SethBurkart123/EvenBetterSEQTA/master/public/icons/betterseqta-dark-full.png#gh-light-mode-only)

<p align="center">
  A beautiful 🤩 Chrome Extension that adds additional features and gives an overall better experience for <a href="https://seqta.com.au">SEQTA Learn.</a> <strong>Currently looking for contributors</strong> 🔥
</p>

<p align="center">
 <a target="_blank" href="https://chrome.google.com/webstore/detail/betterseqta%20/afdgaoaclhkhemfkkkonemoapeinchel"><img src="https://user-images.githubusercontent.com/95666457/149519713-159d7ef7-2c21-4034-a616-f037ff46d9a4.png" alt="ChromeDownload" width="250"></a>
  <a target="_blank" href="https://discord.gg/YzmbnCDkat"><img src="https://github.com/SethBurkart123/EvenBetterSEQTA/assets/108050083/23055730-b16e-44c0-9bef-221d8545af92" width="240" style="border-radius:10%;" /></a>
</p>

## Table of contents

- [Features](#features)
- [Getting Started](#getting-started)

## Release Videos
<video autoplay loop muted controls="false" width="33%" src="https://github.com/SethBurkart123/EvenBetterSEQTA/assets/108050083/3084644a-edbc-40e5-b1ad-1fdea4f0ca18"></video>

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
  - Vivaldi Supported
  - Firefox (currently not supported, plans for it in future though [manifest v3 problems])
  - Safari (Experimental - only available via compilation)

## Getting started

1. Clone the repository

```
git clone https://github.com/SethBurkart123/EvenBetterSEQTA
```

### Windows

Open the `install.bat` file located inside the `scripts` folder. Then after that is finished, open the `dev.bat` file.

### Mac & Linux

1. `cd` into the seqta folder
```
cd EvenBetterSEQTA/scripts
```
2. Make the scripts in the folder executable
```
chmod a+x *
```
3. Run the install and dev scripts
```
sh install.sh
```
4. Open a new terminal session to let the new command activate, then run
```
sh dev.sh
```

### Manual

1. Install dependencies

```
npm install
```

2. Install webpack

```
npm install -g webpack
```

3. Run the dev script (it updates as you save files)

```
npm run dev
```

4. Install and run the dev script for the interface **at the same time** (all custom react components are a separate sub-repository)

```
cd interface

npm install
npm run dev
```


## Folder Structure

The folder structure is as follows:

- The `public` folder contains files that are not compiled, but only copied across to the build directory

- The `src` folder contains source files that are compiled to the build directory, these can use import statements so that we can do code splitting.

- The `interface` folder contains source React files that are required for the UI/UX of the Settings page. It is compiled into the build directory alongside files within `src/`.

- The `build` folder is where the compiled code ends up, this is the folder what you need to load into chrome as an unpacked extension for development.

- The `safari` folder is an Xcode project, building it for MacOS does work, IOS needs a few modifications to the manifest to work, but I have managed to get it working (but because of the styling not being designed for phone, its basically useless for now).

## Credits

This extension was initially developed by [Nulkem](https://github.com/Nulkem/betterseqta), was ported to manifest V3 by [MEGA-Dawg68](https://github.com/MEGA-Dawg68) and is currently under active development by [SethBurkart123](https://github.com/SethBurkart123) and [Crazypersonalph](https://github.com/Crazypersonalph)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=sethburkart123/EvenBetterSEQTA&type=Date)](https://star-history.com/#sethburkart123/EvenBetterSEQTA&Date)
