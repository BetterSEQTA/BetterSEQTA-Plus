import { base64ToBlob } from "./base64.ts";

const LOG = "[BetterSEQTA+] theme page:";
const BRIDGE_ID = "bsplus-theme-image-bridge";
const PAYLOAD_ID = "bsplus-theme-image-payload";
const IMAGES_STYLE_ID = "bsplus-theme-images";
const THEME_STYLE_ID = "custom-theme";
const PREVIEW_STYLE_ID = "custom-theme-preview";
const urlCache = new Set();
let headObserver = null;

function log(event, detail) {
  if (!document.documentElement.hasAttribute("data-bsplus-verbose-log")) return;
  console.info(LOG, event, detail);
}

function releaseCache(cache) {
  for (const url of cache) URL.revokeObjectURL(url);
  cache.clear();
}

function styleEl(id) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  return el;
}

function keepThemeStyleLast() {
  const themeStyle = document.getElementById(THEME_STYLE_ID);
  if (
    themeStyle &&
    document.head.contains(themeStyle) &&
    document.head.lastElementChild !== themeStyle
  ) {
    document.head.appendChild(themeStyle);
  }
}

function watchHead() {
  if (headObserver) return;
  headObserver = new MutationObserver(keepThemeStyleLast);
  headObserver.observe(document.head, { childList: true });
}

function setStyleText(id, text, watchThemeOrder) {
  if (!text) {
    document.getElementById(id)?.remove();
    return;
  }
  styleEl(id).textContent = text;
  if (watchThemeOrder) {
    watchHead();
    keepThemeStyleLast();
  }
}

function applyThemeImages(images) {
  releaseCache(urlCache);
  if (!images?.length) {
    setStyleText(IMAGES_STYLE_ID, "");
    return;
  }
  const lines = [":root {"];
  for (const img of images) {
    if (!img?.variableName || !img.data) continue;
    try {
      const url = URL.createObjectURL(base64ToBlob(img.data, img.mime || "image/png"));
      urlCache.add(url);
      lines.push(`  --${img.variableName}: url("${url}");`);
    } catch (e) {
      console.warn(LOG, "skip image", img.variableName, e);
    }
  }
  lines.push("}");
  styleEl(IMAGES_STYLE_ID).textContent = lines.join("\n");
  log("images applied", { count: images.length });
}

function clearAll() {
  releaseCache(urlCache);
  setStyleText(IMAGES_STYLE_ID, "");
  document.getElementById(THEME_STYLE_ID)?.remove();
  document.getElementById(PREVIEW_STYLE_ID)?.remove();
  headObserver?.disconnect();
  headObserver = null;
  log("cleared");
}

function processPayload() {
  const raw = document.getElementById(PAYLOAD_ID)?.value;
  if (!raw) {
    clearAll();
    return;
  }

  try {
    const payload = JSON.parse(raw);
    if (!payload || payload.clear) {
      clearAll();
      return;
    }

    if (payload.images !== undefined) applyThemeImages(payload.images);
    if (payload.customCss !== undefined) {
      setStyleText(THEME_STYLE_ID, payload.customCss || "", true);
      log("custom css applied");
    }
    if (payload.previewCss !== undefined) {
      setStyleText(PREVIEW_STYLE_ID, payload.previewCss || "");
      const previewStyle = document.getElementById(PREVIEW_STYLE_ID);
      if (previewStyle) document.head.appendChild(previewStyle);
    }
    if (payload.clearPreview) setStyleText(PREVIEW_STYLE_ID, "");
  } catch (e) {
    console.warn(LOG, "invalid payload", e);
  }
}

function ensureBridge() {
  if (!document.getElementById(PAYLOAD_ID)) {
    const payload = document.createElement("textarea");
    payload.id = PAYLOAD_ID;
    payload.hidden = true;
    payload.setAttribute("aria-hidden", "true");
    payload.tabIndex = -1;
    document.documentElement.appendChild(payload);
  }
  if (!document.getElementById(BRIDGE_ID)) {
    const bridge = document.createElement("div");
    bridge.id = BRIDGE_ID;
    bridge.hidden = true;
    bridge.setAttribute("aria-hidden", "true");
    document.documentElement.appendChild(bridge);
  }
}

if (!window.__bsplusThemePagePatched) {
  window.__bsplusThemePagePatched = true;
  ensureBridge();
  new MutationObserver(processPayload).observe(document.getElementById(BRIDGE_ID), {
    attributes: true,
    attributeFilter: ["data-rev"],
  });
  processPayload();
  log("patch active");
}
