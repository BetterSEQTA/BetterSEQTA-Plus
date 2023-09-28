import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.js'
import './index.css'
import { SettingsContextProvider } from './SettingsContext.js';

const root = ReactDOM.createRoot(document.getElementById('ExtensionPopup')!);


root.render(
  <React.StrictMode>
    <SettingsContextProvider>
      <App />
    </SettingsContextProvider>
  </React.StrictMode>,
);