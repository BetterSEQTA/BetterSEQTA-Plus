import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.js'
import './index.css'
// @ts-expect-error There aren't any types for the below library
import ColorPicker from 'react-best-gradient-color-picker';

const root = ReactDOM.createRoot(document.getElementById('ExtensionPopup')!);

// @ts-expect-error woaefoiahef
// eslint-disable-next-line
function Testing() {
  const [color, setColor] = useState('#fffff');

  return <ColorPicker value={color} onChange={setColor} />
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);