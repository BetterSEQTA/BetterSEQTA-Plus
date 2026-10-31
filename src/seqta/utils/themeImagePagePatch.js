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
  var OVERLAY_STYLE_ID = "bsplus-remote-theme-overlay";
  var OVERLAY_IMAGES_STYLE_ID = "bsplus-remote-theme-overlay-images";
  var urlCache = {};
  var overlayUrlCache = {};
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

  function releaseCache(cache) {
    for (var key in cache) {
      if (!Object.prototype.hasOwnProperty.call(cache, key)) continue;
      try {
        URL.revokeObjectURL(cache[key]);
      } catch (e) {}
    }
    for (key in cache) {
      if (Object.prototype.hasOwnProperty.call(cache, key)) delete cache[key];
    }
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

  function keepOverlayStylesLast() {
    var overlayImages = document.getElementById(OVERLAY_IMAGES_STYLE_ID);
    var overlayCss = document.getElementById(OVERLAY_STYLE_ID);
    if (overlayImages && document.head.contains(overlayImages)) {
      document.head.appendChild(overlayImages);
    }
    if (overlayCss && document.head.contains(overlayCss)) {
      document.head.appendChild(overlayCss);
    }
  }

  function keepThemeStyleLast() {
    var themeStyle = document.getElementById(THEME_STYLE_ID);
    if (themeStyle && document.head.contains(themeStyle) && document.head.lastElementChild !== themeStyle) {
      document.head.appendChild(themeStyle);
    }
    keepOverlayStylesLast();
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

  function applyRootImages(images, styleId, cache, afterApply) {
    releaseCache(cache);
    if (!images?.length) {
      document.getElementById(styleId)?.remove();
      return;
    }
    var lines = [":root {"];
    for (var i = 0; i < images.length; i++) {
      var img = images[i];
      if (!img?.variableName || !img.data) continue;
      try {
        var url = URL.createObjectURL(base64ToBlob(img.data, img.mime));
        cache[img.variableName] = url;
        lines.push('  --' + img.variableName + ': url("' + url + '");');
      } catch (e) {
        console.warn(LOG, "skip image", img.variableName, e);
      }
    }
    lines.push("}");
    styleEl(styleId).textContent = lines.join("\n");
    if (afterApply) afterApply();
    log("images applied", { styleId: styleId, count: images.length });
  }

  function clearOverlayOnly() {
    releaseCache(overlayUrlCache);
    document.getElementById(OVERLAY_STYLE_ID)?.remove();
    document.getElementById(OVERLAY_IMAGES_STYLE_ID)?.remove();
    log("overlay cleared");
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
      if (payload.clearOverlay) {
        clearOverlayOnly();
        return;
      }

      if (payload.images !== undefined) {
        applyRootImages(payload.images, IMAGES_STYLE_ID, urlCache);
      }
      if (payload.customCss !== undefined) {
        setStyleText(THEME_STYLE_ID, payload.customCss || "", true);
        log("custom css applied");
      }
      if (payload.overlayImages !== undefined) {
        applyRootImages(payload.overlayImages, OVERLAY_IMAGES_STYLE_ID, overlayUrlCache, keepOverlayStylesLast);
      }
      if (payload.overlayCss !== undefined) {
        setStyleText(OVERLAY_STYLE_ID, payload.overlayCss || "", false);
        keepOverlayStylesLast();
        log("overlay css applied");
      }
      if (payload.previewCss !== undefined) {
        setStyleText(PREVIEW_STYLE_ID, payload.previewCss || "");
        var previewStyle = document.getElementById(PREVIEW_STYLE_ID);
        if (previewStyle) document.head.appendChild(previewStyle);
      }
      if (payload.clearPreview) setStyleText(PREVIEW_STYLE_ID, "");
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
