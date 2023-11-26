import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { SettingsContextProvider } from './SettingsContext.js';
import SettingsPage from './SettingsPage.js';
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


const root = ReactDOM.createRoot(document.getElementById('ExtensionPopup')!);

root.render(
  <React.StrictMode>
    <SettingsContextProvider>
      <HashRouter>
        <Routes>
          <Route path="/settings" element={<SettingsPage standalone={true} />} />
          <Route path="/settings/embedded" element={<SettingsPage standalone={false} />} />
        </Routes>
      </HashRouter>
    </SettingsContextProvider>
  </React.StrictMode>,
);