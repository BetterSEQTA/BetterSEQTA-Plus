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
  var state = {
    customCss: "",
    previewCss: "",
  };
  var headObserver = null;

  function log(event, detail) {
    if (!document.documentElement.hasAttribute("data-bsplus-verbose-log")) return;
    if (detail !== undefined) {
      console.info(LOG, event, detail);
    } else {
      console.info(LOG, event);
    }
  }

  function base64ToBlob(base64, mime) {
    var byteString = atob(base64);
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime || "image/png" });
  }

  function releaseCachedUrls() {
    for (var key in urlCache) {
      if (!urlCache.hasOwnProperty(key)) continue;
      try {
        URL.revokeObjectURL(urlCache[key]);
      } catch (e) {
        // ignore
      }
    }
    urlCache = {};
  }

  function ensureStyleElement(id) {
    var style = document.getElementById(id);
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      document.head.appendChild(style);
    }
    return style;
  }

  function ensureThemeStyleLast() {
    var style = document.getElementById(THEME_STYLE_ID);
    if (!style || !document.head.contains(style)) return;
    if (document.head.lastElementChild === style) return;
    document.head.appendChild(style);
  }

  function ensureHeadObserver() {
    if (headObserver) return;
    headObserver = new MutationObserver(function () {
      ensureThemeStyleLast();
    });
    headObserver.observe(document.head, { childList: true });
  }

  function clearAll() {
    releaseCachedUrls();
    state.customCss = "";
    state.previewCss = "";
    var imagesStyle = document.getElementById(IMAGES_STYLE_ID);
    if (imagesStyle) imagesStyle.textContent = "";
    var themeStyle = document.getElementById(THEME_STYLE_ID);
    if (themeStyle) themeStyle.remove();
    var previewStyle = document.getElementById(PREVIEW_STYLE_ID);
    if (previewStyle) previewStyle.remove();
    if (headObserver) {
      headObserver.disconnect();
      headObserver = null;
    }
    log("cleared");
  }

  function applyThemeImages(images) {
    releaseCachedUrls();
    if (!images || !images.length) {
      var emptyStyle = document.getElementById(IMAGES_STYLE_ID);
      if (emptyStyle) emptyStyle.textContent = "";
      return;
    }

    var lines = [":root {"];
    for (var i = 0; i < images.length; i++) {
      var img = images[i];
      if (!img || !img.variableName || !img.data) continue;
      try {
        var blob = base64ToBlob(img.data, img.mime);
        var url = URL.createObjectURL(blob);
        urlCache[img.variableName] = url;
        lines.push("  --" + img.variableName + ": url(\"" + url + "\");");
      } catch (e) {
        console.warn(LOG, "skip image", img.variableName, e);
      }
    }
    lines.push("}");
    ensureStyleElement(IMAGES_STYLE_ID).textContent = lines.join("\n");
    log("images applied", { count: images.length });
  }

  function applyCustomCss(css) {
    if (!css) {
      var existing = document.getElementById(THEME_STYLE_ID);
      if (existing) existing.remove();
      return;
    }
    ensureStyleElement(THEME_STYLE_ID).textContent = css;
    ensureHeadObserver();
    ensureThemeStyleLast();
  }

  function applyPreviewCss(css) {
    if (!css) {
      var existing = document.getElementById(PREVIEW_STYLE_ID);
      if (existing) existing.remove();
      return;
    }
    ensureStyleElement(PREVIEW_STYLE_ID).textContent = css;
  }

  function processPayload() {
    var payloadEl = document.getElementById(PAYLOAD_ID);
    if (!payloadEl) return;
    var raw = payloadEl.value;
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

      if (payload.images !== undefined) {
        applyThemeImages(payload.images);
      }

      if (payload.customCss !== undefined) {
        state.customCss = payload.customCss || "";
        applyCustomCss(state.customCss);
        log("custom css applied");
      }

      if (payload.previewCss !== undefined) {
        state.previewCss = payload.previewCss || "";
        applyPreviewCss(state.previewCss);
      }

      if (payload.clearPreview) {
        state.previewCss = "";
        applyPreviewCss("");
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
  var bridge = document.getElementById(BRIDGE_ID);
  new MutationObserver(function () {
    processPayload();
  }).observe(bridge, {
    attributes: true,
    attributeFilter: ["data-rev"],
  });

  processPayload();
  log("patch active");
})();
