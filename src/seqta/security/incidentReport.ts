import { jsPDF } from "jspdf";
import browser from "webextension-polyfill";

import type { ThreatAnalysis, ThreatFinding } from "./analyzeHtmlThreats";

export type ThreatSurface = "message" | "notice";

export interface IncidentReport {
  generatedAtIso: string;
  surface: ThreatSurface;
  extensionVersion: string;
  pageUrl: string;
  contextTitle?: string;
  contextSubtitle?: string;
  analysis: ThreatAnalysis;
  contentFingerprint?: string;
}

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getExtensionVersion(): string {
  try {
    return browser.runtime?.getManifest?.()?.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export async function buildIncidentReport(opts: {
  surface: ThreatSurface;
  analysis: ThreatAnalysis;
  rawSnippet?: string;
  contextTitle?: string;
  contextSubtitle?: string;
  extensionVersion?: string;
}): Promise<IncidentReport> {
  let fingerprint: string | undefined;
  if (opts.rawSnippet?.trim()) {
    try {
      if (typeof crypto !== "undefined" && crypto.subtle) {
        fingerprint = await sha256Hex(opts.rawSnippet.slice(0, 50_000));
      }
    } catch {
      fingerprint = undefined;
    }
  }

  const version = opts.extensionVersion ?? getExtensionVersion();

  return {
    generatedAtIso: new Date().toISOString(),
    surface: opts.surface,
    extensionVersion: version,
    pageUrl:
      typeof window !== "undefined" ? window.location.href : "",
    contextTitle: opts.contextTitle,
    contextSubtitle: opts.contextSubtitle,
    analysis: opts.analysis,
    contentFingerprint: fingerprint,
  };
}

function formatFindings(findings: ThreatFinding[]): string {
  return findings.map((f, i) => `${i + 1}. [${f.kind}] ${f.detail}`).join("\n");
}

export function formatIncidentReportPlainText(report: IncidentReport): string {
  const lines = [
    "BetterSEQTA+ Security — incident report",
    "=====================================",
    "",
    `Generated (UTC): ${report.generatedAtIso}`,
    `Surface: ${report.surface}`,
    `Extension version: ${report.extensionVersion}`,
    `Page URL: ${report.pageUrl}`,
  ];
  if (report.contextTitle) lines.push(`Title / subject: ${report.contextTitle}`);
  if (report.contextSubtitle) lines.push(`Detail: ${report.contextSubtitle}`);
  if (report.contentFingerprint) {
    lines.push(`Content SHA-256 (truncated input): ${report.contentFingerprint}`);
  }
  lines.push("", "Findings:", formatFindings(report.analysis.findings), "");
  lines.push(
    "Next steps:",
    "- Contact your school SEQTA / IT administrator and ask them to remove or sanitise the malicious content at source.",
    "- Attach this report (PDF or pasted text) when reporting.",
  );
  return lines.join("\n");
}

export async function copyIncidentReport(report: IncidentReport): Promise<void> {
  const text = formatIncidentReportPlainText(report);
  await navigator.clipboard.writeText(text);
}

export function downloadIncidentReportPdf(report: IncidentReport): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;
  const lineHeight = 14;
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;

  const pushLines = (text: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
    for (const line of wrapped) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
  };

  pushLines("BetterSEQTA+ Security — incident report", true);
  pushLines(`Generated (UTC): ${report.generatedAtIso}`);
  pushLines(`Surface: ${report.surface}`);
  pushLines(`Extension version: ${report.extensionVersion}`);
  pushLines(`Page URL: ${report.pageUrl}`);
  if (report.contextTitle) pushLines(`Title / subject: ${report.contextTitle}`);
  if (report.contextSubtitle) pushLines(`Detail: ${report.contextSubtitle}`);
  if (report.contentFingerprint) {
    pushLines(`Content SHA-256 (truncated input): ${report.contentFingerprint}`);
  }
  pushLines("");
  pushLines("Findings:", true);
  for (const f of report.analysis.findings) {
    pushLines(`• [${f.kind}] ${f.detail}`);
  }
  pushLines("");
  pushLines("Next steps:", true);
  pushLines(
    "Contact your school SEQTA / IT administrator and ask them to remove or sanitise the malicious content at source. Attach this PDF when reporting.",
  );

  doc.save(`betterseqta-security-report-${report.surface}-${Date.now()}.pdf`);
}

export function openIncidentReportEmail(report: IncidentReport): void {
  const subject = encodeURIComponent(
    "SEQTA: suspected malicious HTML blocked by BetterSEQTA+ Security",
  );
  const body = encodeURIComponent(
    formatIncidentReportPlainText(report).slice(0, 1800) +
      "\n\n[If truncated: use Copy in the report dialog for the full text.]",
  );
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}
