import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { SettingsContextProvider } from './SettingsContext.js';
import SettingsPage from './SettingsPage.js';
import browser from 'webextension-polyfill';
import font from 'url:../resources/fonts/IconFamily.woff'

import * as Sentry from "@sentry/react";

browser.storage.local.get([ "telemetry" ]).then((telemetry) => {
  if (telemetry.telemetry === true)
  Sentry.init({
    dsn: "https://4bc7197431b170218e15daba4095d08b@o4506347383291904.ingest.sentry.io/4506347394105344",
    integrations: [
      Sentry.browserTracingIntegration()
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of the transactions
  });
})

const style = document.createElement("style");
style.setAttribute("type", "text/css");
style.innerHTML = `
@font-face {
  font-family: 'IconFamily';
  src: url('${font}') format('woff');
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