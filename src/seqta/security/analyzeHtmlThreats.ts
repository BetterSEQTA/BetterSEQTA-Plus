import DOMPurify from "dompurify";

export interface ThreatFinding {
  kind: string;
  detail: string;
}

export interface ThreatAnalysis {
  blocked: boolean;
  findings: ThreatFinding[];
}

const INLINE_HANDLER_RE = /^on[a-z]+$/i;

const DANGEROUS_SCHEME_RE =
  /^\s*(javascript|vbscript|about\s*:|file\s*:)/i;

/** Inline data URIs except common raster images (emails often embed PNG/JPEG). */
function isDangerousDataUri(url: string): boolean {
  const v = url.trim().toLowerCase();
  if (!v.startsWith("data:")) return false;
  if (/^data:image\/(png|jpe?g|gif|webp|bmp)([;,]|$)/i.test(v)) return false;
  return true;
}

/** Patterns inside executable contexts (script bodies). */
const SCRIPT_TEXT_SUSPICIOUS =
  /\beval\s*\(|new\s+Function\s*\(|document\s*\.\s*write|\.execScript\s*\(/i;

function addFinding(
  findings: ThreatFinding[],
  kind: string,
  detail: string,
): void {
  if (findings.some((f) => f.kind === kind && f.detail === detail)) return;
  findings.push({ kind, detail });
}

function inspectUrlAttr(attrName: string, value: string): ThreatFinding[] {
  const out: ThreatFinding[] = [];
  const v = value.trim();
  if (!v) return out;
  if (DANGEROUS_SCHEME_RE.test(v) || isDangerousDataUri(v)) {
    out.push({
      kind: "dangerous_url_scheme",
      detail: `${attrName}="${v.slice(0, 120)}${v.length > 120 ? "…" : ""}"`,
    });
  }
  return out;
}

function walkElement(el: Element, findings: ThreatFinding[]): void {
  const tag = el.tagName.toLowerCase();

  if (tag === "script") {
    const src = el.getAttribute("src")?.trim() ?? "";
    if (
      src &&
      (DANGEROUS_SCHEME_RE.test(src) || isDangerousDataUri(src))
    ) {
      addFinding(findings, "script_src", `script src="${src.slice(0, 160)}"`);
    } else if (!src && el.textContent && SCRIPT_TEXT_SUSPICIOUS.test(el.textContent)) {
      addFinding(
        findings,
        "script_pattern",
        "Inline script contains suspicious patterns (eval/new Function/document.write).",
      );
    } else {
      addFinding(findings, "script_tag", "A script element is present in HTML.");
    }
    return;
  }

  if (tag === "meta") {
    const httpEquiv = el.getAttribute("http-equiv")?.toLowerCase();
    if (httpEquiv === "refresh") {
      addFinding(
        findings,
        "meta_refresh",
        'meta http-equiv="refresh" can redirect or execute unexpectedly.',
      );
    }
  }

  if (tag === "iframe" || tag === "frame") {
    const src = el.getAttribute("src")?.trim() ?? "";
    const srcdoc = el.getAttribute("srcdoc") ?? "";
    findings.push(...inspectUrlAttr("iframe[src]", src));
    if (srcdoc.length > 0) {
      addFinding(
        findings,
        "iframe_srcdoc",
        "iframe srcdoc may embed arbitrary markup; nested analysis follows.",
      );
      nestedAnalyze(srcdoc, findings, 2);
    }
  }

  if (tag === "object" || tag === "embed") {
    const url =
      el.getAttribute("data") ?? el.getAttribute("src") ?? "";
    findings.push(...inspectUrlAttr(`${tag}[src/data]`, url));
  }

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name;
    if (INLINE_HANDLER_RE.test(name)) {
      addFinding(
        findings,
        "inline_event_handler",
        `${tag}.${name}`,
      );
    }
    const val = attr.value ?? "";
    if (
      name === "href" ||
      name === "src" ||
      name === "action" ||
      name === "formaction" ||
      name === "poster" ||
      name === "data"
    ) {
      findings.push(...inspectUrlAttr(`${tag}[${name}]`, val));
    }
    if (name === "style" && /\burl\s*\(\s*["']?\s*javascript:/i.test(val)) {
      addFinding(findings, "css_javascript_url", `${tag} style contains javascript: URL.`);
    }
  }

  for (const child of Array.from(el.children)) {
    walkElement(child, findings);
  }
}

function nestedAnalyze(fragment: string, findings: ThreatFinding[], depth: number): void {
  if (depth <= 0) return;
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(fragment, "text/html");
  } catch {
    return;
  }
  walkElement(doc.documentElement, findings);
}

/**
 * High-confidence HTML threat signals for user-generated / API HTML (messages, notices).
 *
 * Note: This runs after load for iframes in many cases; pairing with iframe `sandbox`
 * (see BetterSEQTA Security plugin) is required for reliable script blocking — see plugin comments.
 */
export function analyzeHtmlThreats(html: string): ThreatAnalysis {
  const findings: ThreatFinding[] = [];

  if (!html || !html.trim()) {
    return { blocked: false, findings: [] };
  }

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, "text/html");
  } catch {
    return { blocked: false, findings: [] };
  }

  walkElement(doc.documentElement, findings);

  /** SEQTA home modal path uses DOMPurify with onclick allowed; flag removal under stricter rules. */
  const permissive = DOMPurify.sanitize(html, {
    ADD_ATTR: ["onclick"],
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|chrome-extension):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
  const strict = DOMPurify.sanitize(html, {
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
  if (strict !== permissive) {
    addFinding(
      findings,
      "dompurify_delta",
      "Content was altered under strict sanitization (likely inline handlers or risky markup).",
    );
  }

  return {
    blocked: findings.length > 0,
    findings,
  };
}
