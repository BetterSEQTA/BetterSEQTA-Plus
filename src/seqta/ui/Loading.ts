import browser from "webextension-polyfill";
import stringToHTML from "@/seqta/utils/stringToHTML";
import loadingSpinner from "./loading-spinner.html?raw";
import loadingOverlay from "./loading-overlay.html?raw";
import { startLoadingCanvas } from "./loadingCanvas";
import {
  pickLoadingVariant,
  type LoadingVariant,
} from "./loadingVariants";

let stopCanvas: (() => void) | null = null;

const loadingStyles = /* css */ `
  .bkloading {
    --bk-line-color: rgba(255, 255, 255, 0.08);
    --bk-line-accent: rgba(255, 255, 255, 0.15);
    --bk-line-blue: rgba(96, 165, 250, 0.42);
    --bk-grid-color: rgba(255, 255, 255, 0.028);
    --bk-spin-outer: 1s;
    --bk-spin-inner: 3s;
    --bk-spin-small: 3s;
    --bk-stage-name: bkloading-stage-in;
    --bk-stage-duration: 0.85s;
    position: absolute;
    inset: 0;
    z-index: 1000000;
    overflow: hidden;
    contain: strict;
    color: #f4f4f5;
    background:
      radial-gradient(ellipse 70% 45% at 50% 95%, rgba(37, 99, 235, 0.12), transparent 62%),
      linear-gradient(180deg, #010101 0%, #040404 50%, #080808 100%);
    opacity: 1;
    transition: opacity 0.85s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .bkloading.closeLoading {
    opacity: 0;
    pointer-events: none;
  }

  .bkloading__canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .bkloading__vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(ellipse at center, transparent 32%, rgba(0, 0, 0, 0.75) 100%);
    opacity: 0.88;
  }

  .bkloading__content {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
  }

  .bkloading__logo-stage,
  .bkloading-inline {
    position: relative;
  }

  .bkloading__logo-stage {
    width: 220px;
    height: 220px;
    animation-name: var(--bk-stage-name);
    animation-duration: var(--bk-stage-duration);
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
    animation-fill-mode: both;
  }

  .bkloading-inline {
    width: 120px;
    height: 120px;
    margin: 0 auto;
  }

  .bkloading__logo-stage .svg,
  .bkloading-inline .svg {
    transform-origin: center center;
    position: absolute;
    top: 50%;
    left: 50%;
    backface-visibility: hidden;
    will-change: transform;
  }

  .bkloading__logo-stage .logo,
  .bkloading-inline .logo {
    transform: translate3d(-50%, -50%, 0);
  }

  .bkloading__logo-stage .logo {
    z-index: 2;
  }

  .bkloading__logo-stage .big-circle {
    margin: -90px;
    animation: bkloading-spin var(--bk-spin-inner) linear infinite;
  }

  .bkloading__logo-stage .small-circle {
    margin: -67px;
    animation: bkloading-spin var(--bk-spin-small) linear infinite;
  }

  .bkloading__logo-stage .outer-circle {
    margin: -110px;
    animation: bkloading-spin-reverse var(--bk-spin-outer) linear infinite;
  }

  .bkloading-inline .big-circle {
    margin: -88px;
    animation: bkloading-spin 3s linear infinite;
  }

  .bkloading-inline .small-circle {
    margin: -66px;
    animation: bkloading-spin-reverse 3s linear infinite;
  }

  .bkloading-inline .outer-circle {
    margin: -108px;
    animation: bkloading-spin 4.5s linear infinite;
  }

  .bkloading__version {
    position: absolute;
    right: 12px;
    bottom: 10px;
    font-size: 0.95rem;
    letter-spacing: 0.02em;
    color: rgba(255, 255, 255, 0.35);
    pointer-events: none;
  }

  @keyframes bkloading-stage-in {
    from {
      opacity: 0;
      transform: translate3d(0, 12px, 0) scale(0.94);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @keyframes bkloading-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes bkloading-spin-reverse {
    to {
      transform: rotate(-360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bkloading__logo-stage .big-circle,
    .bkloading__logo-stage .small-circle,
    .bkloading__logo-stage .outer-circle,
    .bkloading-inline .big-circle,
    .bkloading-inline .small-circle,
    .bkloading-inline .outer-circle {
      animation: none !important;
    }
  }
`;

function overlayWithSpinner(): string {
  return loadingOverlay.replace(
    "<div class=\"bkloading__logo-stage\"></div>",
    `<div class="bkloading__logo-stage">${loadingSpinner}</div>`,
  );
}

function applyVariantTheme(root: HTMLElement, variant: LoadingVariant) {
  const { theme } = variant;
  root.dataset.variant = variant.id;
  root.style.background = theme.background;
  root.style.setProperty("--bk-spin-outer", theme.spinOuter);
  root.style.setProperty("--bk-spin-inner", theme.spinInner);
  root.style.setProperty("--bk-spin-small", theme.spinSmall);
  root.style.setProperty("--bk-stage-name", theme.stageName);
  root.style.setProperty("--bk-stage-duration", theme.stageDuration);

  const vignette = root.querySelector(".bkloading__vignette") as HTMLElement | null;
  if (vignette) vignette.style.opacity = String(theme.vignetteOpacity);
}

function startCanvasForRoot(root: HTMLElement, variant: LoadingVariant) {
  stopCanvas?.();
  const canvas = root.querySelector(".bkloading__canvas") as HTMLCanvasElement | null;
  stopCanvas = canvas ? startLoadingCanvas(canvas, root, variant) : null;
}

export function AppendLoadingSymbol(givenID: string, position: string) {
  const loadingsymbol = stringToHTML(/* html */ `
      <div id="${givenID}" class="bkloading-inline">
        ${loadingSpinner}
      </div>`).firstChild;

  document.querySelector(position)?.appendChild(loadingsymbol!);
}

export function stopLoadingAnimation() {
  stopCanvas?.();
  stopCanvas = null;
}

export default function loading() {
  stopLoadingAnimation();

  const variant = pickLoadingVariant();

  const loadinghtml = stringToHTML(/* html */ `
    <div class="bkloading" id="loading" data-variant="${variant.id}">
      <style>${loadingStyles}</style>
      ${overlayWithSpinner()}
      <div class="bkloading__version">v${browser.runtime.getManifest().version}</div>
    </div>`);

  const root = loadinghtml.firstChild as HTMLElement;
  document.documentElement.append(root);

  applyVariantTheme(root, variant);
  startCanvasForRoot(root, variant);
}
