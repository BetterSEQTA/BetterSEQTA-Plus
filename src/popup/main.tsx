import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.js'
import './index.css'

const mountNode = document.getElementById("ExtensionPopup");
const shadowRoot = mountNode!.attachShadow({ mode: "open" });

// Step 2: Inject styles into the shadow DOM
const styleLink = document.createElement('link');
styleLink.setAttribute('rel', 'stylesheet');
styleLink.setAttribute('href', 'chrome-extension://adkchjaapbfjofglfpenifpahonbnehk/index.css');
shadowRoot.appendChild(styleLink);

// Step 3: Create a div inside shadow root to serve as the React root
const reactRoot = document.createElement('div');
shadowRoot.appendChild(reactRoot);

const root = ReactDOM.createRoot(reactRoot);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
