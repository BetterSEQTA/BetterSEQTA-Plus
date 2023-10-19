import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.js'
import './index.css'
import { SettingsContextProvider } from './SettingsContext.js';

const root = ReactDOM.createRoot(document.getElementById('ExtensionPopup')!);

const fontURL = chrome.runtime.getURL("fonts/IconFamily.woff");

const style = document.createElement("style");
style.setAttribute("type", "text/css");
style.innerHTML = `
@font-face {
  font-family: 'IconFamily';
  src: url('${fontURL}') format('woff');
  font-weight: normal;
  font-style: normal;
}`;
document.head.appendChild(style);

root.render(
  <React.StrictMode>
    <SettingsContextProvider>
      <App />
    </SettingsContextProvider>
  </React.StrictMode>,
);