import type { ThreatAnalysis } from "./analyzeHtmlThreats";
import {
  buildIncidentReport,
  copyIncidentReport,
  downloadIncidentReportPdf,
  formatIncidentReportPlainText,
  openIncidentReportEmail,
  type IncidentReport,
} from "./incidentReport";

/** Mounted by BetterSEQTA Security on messages / notices when HTML is blocked. */
export const SECURITY_BLOCK_HOST_CLASS = "bss-security-block-host";
/** Body-fixed layer for message pane (survives React replacing iframe wrappers). */
export const SECURITY_MESSAGE_OVERLAY_CLASS = "bss-security-message-overlay";
const HOST_CLASS = SECURITY_BLOCK_HOST_CLASS;
const REPORT_LAYER_CLASS = "bss-security-report-layer";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: Partial<CSSStyleDeclaration>,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  Object.assign(btn.style, {
    padding: "10px 18px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(220,38,38,0.35)",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "background 0.2s, transform 0.2s",
  } as CSSStyleDeclaration);
  btn.addEventListener("mouseenter", () => {
    btn.style.background = "rgba(220,38,38,0.55)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "rgba(220,38,38,0.35)";
  });
  btn.addEventListener("click", onClick);
  return btn;
}

function removeExistingReportLayer(doc: Document): void {
  doc.querySelectorAll(`.${REPORT_LAYER_CLASS}`).forEach((n) => n.remove());
}

export interface MountBlockedContentOptions {
  surface: "message" | "notice";
  analysis: ThreatAnalysis;
  rawSnippet?: string;
  contextTitle?: string;
  contextSubtitle?: string;
  hostDocument?: Document;
  /**
   * Panel lives on document.body (fixed layer). Omits `position: relative` so the caller can pin position/size.
   */
  rootOverlay?: boolean;
}

export function mountBlockedContentUi(
  container: HTMLElement,
  options: MountBlockedContentOptions,
): () => void {
  const doc = options.hostDocument ?? document;
  container.innerHTML = "";
  container.classList.add(HOST_CLASS);
  const basePanel: Partial<CSSStyleDeclaration> = {
    boxSizing: "border-box",
    minHeight: options.rootOverlay ? "min(100%, 260px)" : "220px",
    padding: "24px",
    borderRadius: "12px",
    background:
      "linear-gradient(145deg, rgba(30,30,35,0.98), rgba(20,20,24,0.98))",
    border: "1px solid rgba(239,68,68,0.45)",
    color: "#f4f4f5",
    fontFamily: "system-ui, Segoe UI, Roboto, sans-serif",
    lineHeight: "1.5",
  };
  if (options.rootOverlay) {
    Object.assign(container.style, {
      ...basePanel,
      height: "100%",
      overflow: "auto",
    });
  } else {
    Object.assign(container.style, {
      ...basePanel,
      position: "relative",
    });
  }

  const title = el("h2", {
    margin: "0 0 12px 0",
    fontSize: "20px",
    fontWeight: "700",
    color: "#fff",
  }, "BetterSEQTA Security");

  const lead = el("p", {
    margin: "0 0 12px 0",
    fontSize: "15px",
    color: "#e4e4e7",
  });
  lead.textContent =
    "This content was not shown because BetterSEQTA+ detected potentially malicious HTML (for example scripts or dangerous links). This helps protect your account from cross-site scripting.";

  const admin = el("p", {
    margin: "0 0 20px 0",
    fontSize: "14px",
    color: "#a1a1aa",
  });
  admin.textContent =
    "Contact your school SEQTA or IT administrator so they can remove or fix the message or notice at source.";

  const actions = el("div", {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "center",
  });

  let latestReport: IncidentReport | null = null;

  const openReport = async () => {
    latestReport = await buildIncidentReport({
      surface: options.surface,
      analysis: options.analysis,
      rawSnippet: options.rawSnippet,
      contextTitle: options.contextTitle,
      contextSubtitle: options.contextSubtitle,
    });
    removeExistingReportLayer(doc);
    const layer = doc.createElement("div");
    layer.className = REPORT_LAYER_CLASS;
    Object.assign(layer.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483647",
      background: "rgba(0,0,0,0.55)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      boxSizing: "border-box",
    });

    const panel = doc.createElement("div");
    Object.assign(panel.style, {
      maxWidth: "640px",
      width: "100%",
      maxHeight: "85vh",
      overflow: "auto",
      background: "#18181b",
      color: "#fafafa",
      borderRadius: "12px",
      border: "1px solid #3f3f46",
      padding: "24px",
      boxShadow: "0 25px 50px rgba(0,0,0,0.45)",
    });

    const pre = doc.createElement("pre");
    pre.style.whiteSpace = "pre-wrap";
    pre.style.wordBreak = "break-word";
    pre.style.fontSize = "12px";
    pre.style.lineHeight = "1.45";
    pre.style.margin = "0 0 16px 0";
    pre.textContent = formatIncidentReportPlainText(latestReport);

    const row = doc.createElement("div");
    row.style.display = "flex";
    row.style.flexWrap = "wrap";
    row.style.gap = "10px";

    const closeLayer = () => layer.remove();

    row.appendChild(
      button("Close", closeLayer),
    );
    row.appendChild(
      button("Copy report", async () => {
        if (!latestReport) return;
        await copyIncidentReport(latestReport);
      }),
    );
    row.appendChild(
      button("Download PDF", () => {
        if (!latestReport) return;
        downloadIncidentReportPdf(latestReport);
      }),
    );
    row.appendChild(
      button("Email", () => {
        if (!latestReport) return;
        openIncidentReportEmail(latestReport);
      }),
    );

    panel.appendChild(pre);
    panel.appendChild(row);
    layer.appendChild(panel);
    layer.addEventListener("click", (e) => {
      if (e.target === layer) closeLayer();
    });
    doc.body.appendChild(layer);
  };

  actions.appendChild(button("View report", () => void openReport()));

  container.appendChild(title);
  container.appendChild(lead);
  container.appendChild(admin);
  container.appendChild(actions);

  return () => {
    container.innerHTML = "";
    container.classList.remove(HOST_CLASS);
    removeExistingReportLayer(doc);
  };
}
