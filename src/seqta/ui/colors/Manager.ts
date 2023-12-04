import browser from 'webextension-polyfill'
import { GetThresholdOfColor, GetCSSElement } from '../../../SEQTA';
import { lightenAndPaleColor } from './lightenAndPaleColor';
import ColorLuminance from './ColorLuminance';
import { onError } from '../../utils/onError';

// Helper functions
const setCSSVar = (varName: any, value: any) => document.documentElement.style.setProperty(varName, value);
const getChromeURL = (path: any) => browser.runtime.getURL(path);
const applyProperties = (props: any) => Object.entries(props).forEach(([key, value]) => setCSSVar(key, value));

let DarkMode: any = null;

export function updateAllColors(storedSetting: any, newColor = null) {
  // Determine the color to use
  const selectedColor = newColor || storedSetting.selectedColor;

  if (storedSetting.transparencyEffects) {
    document.documentElement.classList.add('transparencyEffects');
  }

  DarkMode = (typeof storedSetting?.DarkMode === 'boolean') ? storedSetting.DarkMode : DarkMode;

  if (typeof storedSetting === 'boolean') {
    DarkMode = storedSetting;
  }

  // Common properties, always applied
  const commonProps = {
    '--better-sub': '#161616',
    '--better-alert-highlight': '#c61851',
    '--better-main': selectedColor
  };

  // Mode-based properties, applied if storedSetting is provided
  let modeProps = {};
  if (DarkMode !== null) {
    modeProps = DarkMode ? {
      '--betterseqta-logo': `url(${getChromeURL('icons/betterseqta-light-full.png')})`
    } : {
      '--better-pale': lightenAndPaleColor(selectedColor),
      '--betterseqta-logo': `url(${getChromeURL('icons/betterseqta-dark-full.png')})`
    };

    if (DarkMode) {
      document.documentElement.style.removeProperty('--better-pale');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  // Dynamic properties, always applied
  const rgbThreshold = GetThresholdOfColor(selectedColor);
  const isBright = rgbThreshold > 210;
  const dynamicProps = {
    '--text-color': isBright ? 'black' : 'white',
    '--better-light': selectedColor === '#ffffff' ? '#b7b7b7' : ColorLuminance(selectedColor, 0.95)
  };

  // Apply all the properties
  applyProperties({ ...commonProps, ...modeProps, ...dynamicProps });

  // Set favicon, if storedSetting is provided
  if (DarkMode !== null) {
    (document.querySelector('link[rel*=\'icon\']')! as HTMLLinkElement).href = getChromeURL('icons/icon-48.png');
  }

  let alliframes = document.getElementsByTagName('iframe');
  let fileref = GetCSSElement('css/iframe.css');

  for (let i = 0; i < alliframes.length; i++) {
    const element = alliframes[i];

    if (element.getAttribute('excludeDarkCheck') == 'true') {
      continue;
    }
    
    console.log(element);
    console.log(element.contentDocument!.documentElement);

    (element.contentDocument!.documentElement.childNodes[1] as HTMLIFrameElement).style.color =
      DarkMode ? 'white' : 'black';
    element.contentDocument!.documentElement.firstChild!.appendChild(
      fileref,
    );
  }
}

export function getDarkMode() {
  return new Promise((resolve, reject) => {
    const result = browser.storage.local.get('DarkMode')
    function open (result: any) {
      if (browser.runtime.lastError) {
        return reject(browser.runtime.lastError);
      }
      resolve(result.DarkMode);
    }
    result.then(open, onError)
  });
}