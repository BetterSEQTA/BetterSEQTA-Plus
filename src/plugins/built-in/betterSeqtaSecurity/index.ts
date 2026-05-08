/**
 * BetterSEQTA Security — core XSS-focused protections for HTML rendered from SEQTA APIs.
 *
 * Execution vs detection: SEQTA loads message bodies in same-origin `iframe.userHTML`.
 * Scripts may run during parse before our scan completes. We set `sandbox="allow-same-origin"`
 * (without `allow-scripts`) on those iframes so script execution is suppressed while we can
 * still read `contentDocument` for scanning and existing theme/CSS injection.
 *
 * The warning UI is mounted on document.body (fixed layer aligned to the reading pane) so
 * React replacing `.uiFrameWrapper` / iframe siblings does not destroy it.
 */
import type { Plugin } from "../../core/types";
import {
  analyzeHtmlThreats,
  type ThreatAnalysis,
} from "@/seqta/security/analyzeHtmlThreats";
import {
  mountBlockedContentUi,
  SECURITY_MESSAGE_OVERLAY_CLASS,
} from "@/seqta/security/blockedContentUi";
import { eventManager } from "@/seqta/utils/listeners/EventManager";

const USER_HTML_IFRAME_EVENT = "bssSecurityUserHtmlIframe";

const userHtmlIframeLoadHooked = new WeakSet<HTMLIFrameElement>();

/** Tear down body overlay + listeners for this iframe (safe navigation or cleanup). */
const messageOverlayCleanups = new WeakMap<HTMLIFrameElement, () => void>();

function teardownMessageSecurityOverlay(iframe: HTMLIFrameElement): void {
  const fn = messageOverlayCleanups.get(iframe);
  if (fn) {
    fn();
    messageOverlayCleanups.delete(iframe);
  }
}

function applyMessageIframeSandbox(iframe: HTMLIFrameElement): void {
  if (iframe.dataset.bssUserHtmlSandbox === "1") return;
  iframe.dataset.bssUserHtmlSandbox = "1";
  iframe.setAttribute("sandbox", "allow-same-origin");
}

function wipeIframeDocument(iframe: HTMLIFrameElement): void {
  try {
    const d = iframe.contentDocument;
    if (!d) return;
    d.open();
    d.write(
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body></body></html>",
    );
    d.close();
  } catch {
    /* ignore */
  }
}

/**
 * After we replace a malicious document, the iframe fires `load` again with this blank shell.
 * That pass must not tear down the blocker UI or the iframe would “recover” for one frame.
 */
function isPostWipeBlankDocument(doc: Document): boolean {
  const body = doc.body;
  if (!body || body.childElementCount > 0) return false;
  if ((body.textContent ?? "").trim().length > 0) return false;
  const meta = doc.head?.querySelector('meta[charset="utf-8"]');
  if (!meta) return false;
  return doc.documentElement.outerHTML.length < 800;
}

/**
 * Full-screen body layer positioned over the reading pane so SEQTA/React can replace iframe
 * markup without removing this node.
 */
function mountBodyAnchoredMessageOverlay(
  iframe: HTMLIFrameElement,
  anchor: HTMLElement,
  opts: {
    analysis: ThreatAnalysis;
    rawSnippet: string;
    contextTitle?: string;
  },
): void {
  teardownMessageSecurityOverlay(iframe);

  const shell = document.createElement("div");
  shell.className = SECURITY_MESSAGE_OVERLAY_CLASS;
  Object.assign(shell.style, {
    position: "fixed",
    zIndex: "2147483646",
    overflow: "hidden",
    pointerEvents: "auto",
    boxSizing: "border-box",
    padding: "12px",
    background: "rgba(24,24,27,0.35)",
  });

  const inner = document.createElement("div");
  Object.assign(inner.style, {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
  });
  shell.appendChild(inner);

  let raf = 0;
  const syncRect = (): void => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      if (!iframe.isConnected) {
        teardownMessageSecurityOverlay(iframe);
        return;
      }
      if (!anchor.isConnected) {
        teardownMessageSecurityOverlay(iframe);
        return;
      }
      const r = anchor.getBoundingClientRect();
      const pad = 10;
      const left = Math.max(8, r.left - pad);
      const top = Math.max(8, r.top - pad);
      const width = Math.min(window.innerWidth - left - 8, r.width + pad * 2);
      const height = Math.min(window.innerHeight - top - 8, r.height + pad * 2);
      shell.style.left = `${left}px`;
      shell.style.top = `${top}px`;
      shell.style.width = `${Math.max(0, width)}px`;
      shell.style.height = `${Math.max(0, height)}px`;
    });
  };

  syncRect();
  document.body.appendChild(shell);

  const ro = new ResizeObserver(syncRect);
  ro.observe(anchor);

  window.addEventListener("resize", syncRect);
  window.addEventListener("scroll", syncRect, true);

  const unmountPanel = mountBlockedContentUi(inner, {
    surface: "message",
    analysis: opts.analysis,
    rawSnippet: opts.rawSnippet,
    contextTitle: opts.contextTitle,
    rootOverlay: true,
  });

  const cleanup = (): void => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener("resize", syncRect);
    window.removeEventListener("scroll", syncRect, true);
    unmountPanel();
    shell.remove();
  };

  messageOverlayCleanups.set(iframe, cleanup);
}

function handleUserHtmlIframeLoaded(iframe: HTMLIFrameElement): void {
  let idoc: Document | null = null;
  try {
    idoc = iframe.contentDocument;
  } catch {
    return;
  }
  if (!idoc?.documentElement) return;

  const wrapper =
    iframe.closest(".uiFrameWrapper") ??
    iframe.closest(".iframeWrapper") ??
    iframe.parentElement;
  if (!wrapper) return;

  if (
    iframe.dataset.bssAwaitingWipeLoad === "1" &&
    isPostWipeBlankDocument(idoc)
  ) {
    iframe.dataset.bssAwaitingWipeLoad = "";
    return;
  }

  iframe.dataset.bssAwaitingWipeLoad = "";

  teardownMessageSecurityOverlay(iframe);

  iframe.style.visibility = "";
  iframe.style.height = "";
  iframe.style.minHeight = "";

  const html = idoc.documentElement.outerHTML;
  const analysis = analyzeHtmlThreats(html);
  if (!analysis.blocked) return;

  const pane = iframe.closest('[class*="ReadingPane__ReadingPane"]');
  const anchor = (pane ?? wrapper) as HTMLElement;

  iframe.dataset.bssAwaitingWipeLoad = "1";
  wipeIframeDocument(iframe);
  iframe.style.visibility = "hidden";
  iframe.style.height = "0";
  iframe.style.minHeight = "0";

  const subject = pane
    ?.querySelector('[class*="Message__subject___"]')
    ?.textContent?.trim();

  mountBodyAnchoredMessageOverlay(iframe, anchor, {
    analysis,
    rawSnippet: html.slice(0, 50_000),
    contextTitle: subject,
  });
}

const betterSeqtaSecurityPlugin: Plugin = {
  id: "better-seqta-security",
  name: "BetterSEQTA Security",
  description:
    "Blocks risky HTML in messages and notices and surfaces administrator-ready incident reports.",
  version: "1.0.0",
  settings: {},

  run: () => {
    const { unregister } = eventManager.register(
      USER_HTML_IFRAME_EVENT,
      {
        elementType: "iframe",
        customCheck: (element) => element.classList.contains("userHTML"),
      },
      (element) => {
        const iframe = element as HTMLIFrameElement;
        if (userHtmlIframeLoadHooked.has(iframe)) return;
        userHtmlIframeLoadHooked.add(iframe);
        applyMessageIframeSandbox(iframe);

        const onLoad = () => handleUserHtmlIframeLoaded(iframe);
        iframe.addEventListener("load", onLoad);
        queueMicrotask(onLoad);
      },
    );

    return unregister;
  },
};

export default betterSeqtaSecurityPlugin;
