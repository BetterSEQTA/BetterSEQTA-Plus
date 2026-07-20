import browser from "webextension-polyfill";
import stringToHTML from "@/seqta/utils/stringToHTML";
import loadingSpinner from "./loading-spinner.html?raw";

export function AppendLoadingSymbol(givenID: any, position: any) {
  let loadingsymbol = stringToHTML(/* html */ `
      <div id="${givenID}">
        ${loadingSpinner}
      </div>`).firstChild;

  document.querySelector(position).appendChild(loadingsymbol);
}

export default function loading() {
  let loadinghtml = stringToHTML(/* html */ `
    <div class="bkloading" id="loading">
    <style>
      .bkloading {
        transition: color 1ms linear, opacity 1s ease-in-out;
        background-color: rgb(229, 231, 235);
        color: black;
        width: 100%;
        overflow: hidden;
        opacity: 1;
        transition: 1s;
        height: 100%;
        z-index: 1000000;
        position: absolute;
        left: 0;
        top: 0;
      }

      .closeLoading {
        opacity: 0;
      }

      .dark .bkloading {
        background-color: rgb(26, 26, 26);
        color: white;
      }

      .svg {
        transform-origin: center;
        position: absolute;
        top: 50%;
        left: 50%;
        will-change: transform;
      }
      .logo {
        transform: translate(-50%, -50%);
      }
      .big-circle {
        margin: -88px;
        will-change: transform;
        animation-timing-function: ease;
        animation: spin 3s linear infinite;
        -moz-animation: spin 3s linear infinite;
      }
      .small-circle {
        margin: -66px;
        will-change: transform;
        animation-timing-function: ease;
        animation: spin 3s linear infinite;
        -moz-animation: spin 3s linear infinite;
      }
      .outer-circle {
        margin: -108px;
        will-change: transform;
        animation-direction: alternate-reverse;
        animation: spinback 1s linear infinite;
        -moz-animation: spinback 1s linear infinite;
      }
      @-moz-keyframes spin {
        100% {
          -moz-transform: rotate(360deg);
        }
      }
      @-webkit-keyframes spin {
        100% {
          -webkit-transform: rotate(360deg);
        }
      }
      @keyframes spin {
        100% {
          -webkit-transform: rotate(360deg);
          transform: rotate(360deg);
        }
      }
      @keyframes spinback {
        100% {
          -webkit-transform: rotate(-360deg);
          transform: rotate(-360deg);
        }
      }
      </style>
    ${loadingSpinner}
  <div style="position: absolute;bottom: 0;right: 0;padding: 10px;color: #4f4f4f;text-anchor: middle;font-size: 20px;">v${
    browser.runtime.getManifest().version
  }</div></div>`);
  var html = document.getElementsByTagName("html")[0];
  html.append(loadinghtml.firstChild!);
}
