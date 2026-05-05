/**
 * Makes popup hero images/videos open a padded overlay (not browser fullscreen) on click.
 * Escape or backdrop click dismisses it. Clicks use stopPropagation so the
 * parent SEQTA popup does not close.
 */

import { settingsState } from "../listeners/SettingsState";

const FULLSCREENABLE_CLASS = "popup-media-fullscreenable";
const OVERLAY_VISIBLE_CLASS = "bsplus-popup-media-overlay-backdrop--visible";
const OVERLAY_ANIM_MS = 280;

function isImageOrVideo(el: Element): el is HTMLImageElement | HTMLVideoElement {
  return el instanceof HTMLImageElement || el instanceof HTMLVideoElement;
}

export function attachPopupMediaFullscreen(el: HTMLImageElement | HTMLVideoElement) {
  el.classList.add(FULLSCREENABLE_CLASS);
  el.setAttribute("tabindex", "0");
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", "View larger");
  el.title = "Click to view larger";

  const open = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    openMediaOverlayViewer(el);
  };

  el.addEventListener("click", open);
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      open(e);
    }
  });
}

function openMediaOverlayViewer(source: HTMLImageElement | HTMLVideoElement) {
  const backdrop = document.createElement("div");
  backdrop.id = "bsplus-popup-media-overlay";
  backdrop.className = "bsplus-popup-media-overlay-backdrop";

  const inner = document.createElement("div");
  inner.className = "bsplus-popup-media-overlay-inner";

  const slot = document.createElement("div");
  slot.className = "bsplus-popup-media-overlay-slot";

  let media: HTMLImageElement | HTMLVideoElement;
  if (source instanceof HTMLVideoElement) {
    const v = source;
    const nv = document.createElement("video");
    nv.classList.add("bsplus-popup-media-overlay-media");
    nv.controls = true;
    nv.playsInline = true;
    nv.loop = v.loop;
    nv.muted = v.muted;
    nv.volume = v.volume;
    for (const s of v.querySelectorAll("source")) {
      const ns = document.createElement("source");
      ns.src = (s as HTMLSourceElement).src;
      const t = (s as HTMLSourceElement).type;
      if (t) ns.type = t;
      nv.appendChild(ns);
    }
    nv.addEventListener(
      "loadeddata",
      () => {
        try {
          nv.currentTime = v.currentTime;
        } catch {
          /* ignore */
        }
        void nv.play().catch(() => {});
      },
      { once: true },
    );
    v.pause();
    nv.load();
    media = nv;
  } else {
    const img = document.createElement("img");
    img.classList.add("bsplus-popup-media-overlay-media");
    img.src = source.currentSrc || source.src;
    img.alt = source.alt || "";
    media = img;
  }

  media.addEventListener("click", (e) => e.stopPropagation());

  slot.appendChild(media);
  inner.append(slot);
  backdrop.appendChild(inner);
  document.body.append(backdrop);

  if (!settingsState.animations) {
    backdrop.classList.add("bsplus-popup-media-overlay--instant");
    backdrop.classList.add(OVERLAY_VISIBLE_CLASS);
  } else {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        backdrop.classList.add(OVERLAY_VISIBLE_CLASS);
      });
    });
  }

  inner.addEventListener("click", (e) => e.stopPropagation());

  let done = false;
  const removeOverlay = () => {
    if (source instanceof HTMLVideoElement && media instanceof HTMLVideoElement) {
      try {
        source.currentTime = media.currentTime;
      } catch {
        /* ignore */
      }
      void source.play().catch(() => {});
    }
    backdrop.remove();
  };

  const close = () => {
    if (done) return;
    done = true;
    document.removeEventListener("keydown", onDocKey, true);

    if (!settingsState.animations) {
      removeOverlay();
      return;
    }

    backdrop.classList.remove(OVERLAY_VISIBLE_CLASS);
    window.setTimeout(removeOverlay, OVERLAY_ANIM_MS);
  };

  const onDocKey = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.stopPropagation();
      close();
    }
  };

  document.addEventListener("keydown", onDocKey, true);

  backdrop.addEventListener("click", () => {
    close();
  });
}

export function attachPopupMediaFullscreenIfPresent(
  root: ParentNode,
  selector: string,
) {
  const el = root.querySelector(selector);
  if (el && isImageOrVideo(el)) {
    attachPopupMediaFullscreen(el);
  }
}
