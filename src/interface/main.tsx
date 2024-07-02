import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from "react-error-boundary";

import './index.css';
import SettingsPage from './pages/SettingsPage.js';
import browser from 'webextension-polyfill';
import font from '../resources/fonts/IconFamily.woff'

import ThemeCreator from './pages/ThemeCreator';
import Store from './pages/Store';

browser.storage.local.get().then(({ DarkMode }) => {
  if (DarkMode) document.documentElement.classList.add('dark');
})

const style = document.createElement("style");
style.setAttribute("type", "text/css");
style.classList.add('iconFamily')
style.innerHTML = `
@font-face {
  font-family: 'IconFamily';
  src: url('${browser.runtime.getURL(font)}') format('woff');
  font-weight: normal;
  font-style: normal;
}`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('ExtensionPopup')!);

root.render(
  <React.StrictMode>
    <ErrorBoundary fallback={
      <div className="grid w-full h-screen text-center place-content-center dark:text-white">
        <h1 className="text-2xl font-bold">An error occurred 😭😭😭</h1>
        <p className="text-lg">Try clicking this button and see if it helps...</p>
        <button className='flex gap-2 p-2 px-4 mx-auto mt-4 text-white rounded-lg bg-zinc-100 dark:bg-zinc-800/20 outline outline-white/20 w-fit' onClick={() => window.location.reload()}>
          <svg height="18" width="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <g fill="#F7F7F7">
              <path d="M9.03,12.22c-.293-.293-.768-.293-1.061,0s-.293,.768,0,1.061l1.208,1.208c-.059,.002-.118,.012-.178,.012-3.032,0-5.5-2.467-5.5-5.5,0-1.616,.706-3.143,1.938-4.191,.315-.269,.354-.742,.085-1.057s-.74-.353-1.058-.085c-1.567,1.333-2.466,3.277-2.466,5.333,0,3.76,2.983,6.829,6.704,6.985l-.735,.735c-.293,.293-.293,.768,0,1.061,.146,.146,.338,.22,.53,.22s.384-.073,.53-.22l2.25-2.25c.293-.293,.293-.768,0-1.061l-2.25-2.25Z" fill="#F7F7F7"/>
              <path d="M9.296,2.015l.735-.735c.293-.293,.293-.768,0-1.061s-.768-.293-1.061,0l-2.25,2.25c-.293,.293-.293,.768,0,1.061l2.25,2.25c.146,.146,.338,.22,.53,.22s.384-.073,.53-.22c.293-.293,.293-.768,0-1.061l-1.208-1.208c.059-.002,.118-.012,.177-.012,3.032,0,5.5,2.467,5.5,5.5,0,1.616-.706,3.143-1.938,4.191-.315,.269-.354,.742-.085,1.057,.148,.174,.359,.264,.571,.264,.172,0,.345-.059,.486-.179,1.567-1.333,2.466-3.277,2.466-5.333,0-3.76-2.983-6.829-6.704-6.985Z" fill="#F7F7F7"/>
            </g>
          </svg>
          Reload
        </button>
      </div>
    }>
      <HashRouter>
        <Routes>
          <Route path="/settings" element={<SettingsPage standalone={true} />} />
          <Route path="/settings/embedded" element={<SettingsPage standalone={false} />} />
          <Route path="/store" element={<Store />} />
          <Route path="/themeCreator" element={<ThemeCreator />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
