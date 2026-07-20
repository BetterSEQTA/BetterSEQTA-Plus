/**
 * PAGE context only — theme CustomCSS and decorative image variables must live
 * in page-origin stylesheets. Extension-injected #custom-theme cannot load
 * page blob: URLs referenced via var() on Firefox.
 */
(function () {
  if (window.__bsplusThemePagePatched) return;
  window.__bsplusThemePagePatched = true;

  var LOG = "[BetterSEQTA+] theme page:";
  var BRIDGE_ID = "bsplus-theme-image-bridge";
  var PAYLOAD_ID = "bsplus-theme-image-payload";
  var IMAGES_STYLE_ID = "bsplus-theme-images";
  var THEME_STYLE_ID = "custom-theme";
  var PREVIEW_STYLE_ID = "custom-theme-preview";
  var urlCache = {};
  var headObserver = null;

  function log(event, detail) {
    if (!document.documentElement.hasAttribute("data-bsplus-verbose-log")) return;
    console.info(LOG, event, detail);
  }

  function base64ToBlob(base64, mime) {
    var bytes = atob(base64);
    var ab = new ArrayBuffer(bytes.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < bytes.length; i++) view[i] = bytes.charCodeAt(i);
    return new Blob([ab], { type: mime || "image/png" });
  }

  function releaseCachedUrls() {
    for (var key in urlCache) {
      if (!Object.prototype.hasOwnProperty.call(urlCache, key)) continue;
      try {
        URL.revokeObjectURL(urlCache[key]);
      } catch (e) {}
    }
    urlCache = {};
  }

  function styleEl(id) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    return el;
  }

  function keepThemeStyleLast() {
    var themeStyle = document.getElementById(THEME_STYLE_ID);
    if (themeStyle && document.head.contains(themeStyle) && document.head.lastElementChild !== themeStyle) {
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

  function clearAll() {
    releaseCachedUrls();
    setStyleText(IMAGES_STYLE_ID, "");
    document.getElementById(THEME_STYLE_ID)?.remove();
    document.getElementById(PREVIEW_STYLE_ID)?.remove();
    headObserver?.disconnect();
    headObserver = null;
    log("cleared");
  }

  function applyThemeImages(images) {
    releaseCachedUrls();
    if (!images?.length) {
      setStyleText(IMAGES_STYLE_ID, "");
      return;
    }

    var lines = [":root {"];
    for (var i = 0; i < images.length; i++) {
      var img = images[i];
      if (!img?.variableName || !img.data) continue;
      try {
        var url = URL.createObjectURL(base64ToBlob(img.data, img.mime));
        urlCache[img.variableName] = url;
        lines.push('  --' + img.variableName + ': url("' + url + '");');
      } catch (e) {
        console.warn(LOG, "skip image", img.variableName, e);
      }
    }
    lines.push("}");
    styleEl(IMAGES_STYLE_ID).textContent = lines.join("\n");
    log("images applied", { count: images.length });
  }

  function processPayload() {
    var raw = document.getElementById(PAYLOAD_ID)?.value;
    if (!raw) {
      clearAll();
      return;
    }

    try {
      var payload = JSON.parse(raw);
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
      }

      if (payload.clearPreview) {
        setStyleText(PREVIEW_STYLE_ID, "");
      }
    } catch (e) {
      console.warn(LOG, "invalid payload", e);
    }
  }

  function ensureBridge() {
    if (!document.getElementById(PAYLOAD_ID)) {
      var payload = document.createElement("textarea");
      payload.id = PAYLOAD_ID;
      payload.hidden = true;
      payload.setAttribute("aria-hidden", "true");
      payload.tabIndex = -1;
      document.documentElement.appendChild(payload);
    }
    if (!document.getElementById(BRIDGE_ID)) {
      var bridge = document.createElement("div");
      bridge.id = BRIDGE_ID;
      bridge.hidden = true;
      bridge.setAttribute("aria-hidden", "true");
      document.documentElement.appendChild(bridge);
    }
  }

  ensureBridge();
  new MutationObserver(processPayload).observe(document.getElementById(BRIDGE_ID), {
    attributes: true,
    attributeFilter: ["data-rev"],
  });

  processPayload();
  log("patch active");
})();
