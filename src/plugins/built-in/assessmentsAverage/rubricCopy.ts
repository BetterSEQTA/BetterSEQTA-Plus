const RUBRIC_SELECTOR =
  "[class*='AssessableCriterion__rubric___'][class*='Rubric__Rubric___'], [class*='Rubric__Rubric___'][class*='AssessableCriterion__rubric___']";
const ENHANCED_ATTR = "data-betterseqta-rubric-copy";
const STYLE_ID = "betterseqta-rubric-copy-styles-v2";

let observer: MutationObserver | null = null;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .betterseqta-rubric-copy-host {
      position: relative;
    }

    .betterseqta-rubric-copy-overlay {
      position: absolute;
      inset: auto 0 0 0;
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
      padding: 0.75rem 0.85rem;
      pointer-events: none;
      opacity: 0;
      transform: translateY(10px);
      transition:
        opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.72) 0%,
        rgba(0, 0, 0, 0.42) 42%,
        rgba(0, 0, 0, 0.08) 72%,
        transparent 100%
      );
      border-radius: 0 0 8px 8px;
      z-index: 5;
    }

    .betterseqta-rubric-copy-host:hover .betterseqta-rubric-copy-overlay,
    .betterseqta-rubric-copy-host:focus-within .betterseqta-rubric-copy-overlay {
      opacity: 1;
      transform: translateY(0);
    }

    .betterseqta-rubric-copy-btn {
      pointer-events: auto;
      display: inline-flex !important;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.75rem !important;
      margin: 0 !important;
      border: 1px solid rgba(15, 23, 42, 0.12) !important;
      border-radius: 8px !important;
      background: rgba(255, 255, 255, 0.96) !important;
      color: #0f172a !important;
      font-family: Rubik, system-ui, sans-serif !important;
      font-size: 0.8125rem !important;
      font-weight: 600 !important;
      line-height: 1 !important;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);
      transform: translateY(0) scale(1);
      transition:
        transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
        background 0.28s ease,
        color 0.28s ease,
        box-shadow 0.28s ease,
        border-color 0.28s ease;
    }

    .betterseqta-rubric-copy-btn:hover {
      transform: translateY(-1px) scale(1.04) !important;
      background: #f1f5f9 !important;
      color: #0f172a !important;
      border-color: rgba(15, 23, 42, 0.18) !important;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.32);
    }

    .betterseqta-rubric-copy-btn:active {
      transform: translateY(0) scale(0.98) !important;
      background: #e2e8f0 !important;
      color: #0f172a !important;
    }

    .betterseqta-rubric-copy-btn:focus-visible {
      outline: none !important;
      box-shadow:
        0 0 0 2px rgba(255, 255, 255, 0.95),
        0 0 0 4px rgba(59, 130, 246, 0.85) !important;
    }

    .betterseqta-rubric-copy-btn svg {
      width: 1rem !important;
      height: 1rem !important;
      flex-shrink: 0;
      stroke: currentColor !important;
      fill: none !important;
    }

    .betterseqta-rubric-copy-btn.is-copied {
      background: #ecfdf5 !important;
      color: #047857 !important;
      border-color: rgba(4, 120, 87, 0.25) !important;
    }

    .betterseqta-rubric-copy-btn.is-copied:hover {
      background: #d1fae5 !important;
      color: #065f46 !important;
    }

    @media (prefers-reduced-motion: reduce) {
      .betterseqta-rubric-copy-overlay,
      .betterseqta-rubric-copy-btn {
        transition: none;
      }
    }
  `;
  document.head.appendChild(style);
}

function cellText(element: Element | null | undefined): string {
  return element?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface RubricCell {
  text: string;
  selected: boolean;
}

interface RubricTableData {
  header: string[];
  rows: RubricCell[][];
}

function parseRubricTable(rubric: Element): RubricTableData | null {
  const lines = rubric.querySelectorAll("[class*='Rubric__line___']");
  const rows: RubricCell[][] = [];

  lines.forEach((line) => {
    const meta = line.querySelector("[class*='Rubric__meta___']");
    const label = cellText(meta?.querySelector("[class*='Rubric__label___']"));
    const criterion = cellText(
      meta?.querySelector("[class*='Rubric__description___']"),
    );

    const row: RubricCell[] = [
      { text: label, selected: false },
      { text: criterion, selected: false },
    ];

    line.querySelectorAll("[class*='Rubric__descriptor___']").forEach((descriptor) => {
      const text = cellText(
        descriptor.querySelector("[class*='Rubric__description___']"),
      );
      const selected = Array.from(descriptor.classList).some((cls) =>
        cls.startsWith("Rubric__selected___"),
      );
      row.push({ text, selected });
    });

    if (row.some((cell) => cell.text)) rows.push(row);
  });

  if (!rows.length) return null;

  const maxCols = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => {
    const copy = [...row];
    while (copy.length < maxCols) {
      copy.push({ text: "", selected: false });
    }
    return copy;
  });

  const header = [
    "Category",
    "Criterion",
    ...Array.from({ length: maxCols - 2 }, (_, i) => `Band ${i + 1}`),
  ].slice(0, maxCols);

  return { header, rows: normalized };
}

function rubricToPlainText(table: RubricTableData): string {
  const formatCell = (cell: RubricCell) =>
    cell.selected && cell.text ? `${cell.text} (selected)` : cell.text;

  return [
    table.header.join("\t"),
    ...table.rows.map((row) => row.map(formatCell).join("\t")),
  ].join("\n");
}

const RUBRIC_PASTE_FONT_PT = 7;

function rubricPasteFontStyle(): string {
  return [
    `font-size:${RUBRIC_PASTE_FONT_PT}pt`,
    "mso-ansi-font-size:8.0pt",
    "mso-bidi-font-size:8.0pt",
    "font-family:Calibri,Arial,sans-serif",
    "line-height:1.2",
  ].join(";");
}

function rubricPasteCellContent(text: string): string {
  return `<span style="${rubricPasteFontStyle()}">${escapeHtml(text)}</span>`;
}

function rubricToHtmlTable(table: RubricTableData): string {
  const baseFont = rubricPasteFontStyle();
  const cellStyle =
    `border:1px solid #000000;border-collapse:collapse;padding:4px;vertical-align:top;${baseFont}`;
  const headerStyle = `${cellStyle}background:#f3f4f6;font-weight:700;`;
  const selectedStyle = `${cellStyle}background:#dbeafe;font-weight:600;`;

  const headerRow = table.header
    .map(
      (heading) =>
        `<th style="${headerStyle}">${rubricPasteCellContent(heading)}</th>`,
    )
    .join("");

  const bodyRows = table.rows
    .map((row) => {
      const cells = row
        .map((cell) => {
          const style = cell.selected ? selectedStyle : cellStyle;
          return `<td style="${style}">${rubricPasteCellContent(cell.text)}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return [
    `<table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;${baseFont}">`,
    `<thead><tr>${headerRow}</tr></thead>`,
    `<tbody>${bodyRows}</tbody>`,
    "</table>",
  ].join("");
}

function rubricToHtmlDocument(table: RubricTableData): string {
  return [
    "<!DOCTYPE html>",
    "<html>",
    "<head><meta charset=\"utf-8\"></head>",
    `<body style="${rubricPasteFontStyle()}">`,
    rubricToHtmlTable(table),
    "</body>",
    "</html>",
  ].join("");
}

async function copyRubricTable(rubric: Element, button: HTMLButtonElement) {
  const table = parseRubricTable(rubric);
  if (!table) return;

  const plain = rubricToPlainText(table);
  const htmlTable = rubricToHtmlTable(table);
  const htmlDocument = rubricToHtmlDocument(table);

  let copied = false;

  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }),
          "text/html": new Blob([htmlDocument], { type: "text/html" }),
        }),
      ]);
      copied = true;
    } catch {
      // Fall through to legacy rich-text copy.
    }
  }

  if (!copied) {
    const host = document.createElement("div");
    host.contentEditable = "true";
    host.innerHTML = htmlTable;
    host.style.position = "fixed";
    host.style.left = "-9999px";
    host.style.top = "0";
    document.body.appendChild(host);

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(host);
    selection?.removeAllRanges();
    selection?.addRange(range);

    copied = document.execCommand("copy");

    selection?.removeAllRanges();
    host.remove();

    if (!copied) {
      await navigator.clipboard.writeText(plain);
    }
  }

  const label = button.querySelector(".betterseqta-rubric-copy-label");
  const original = label?.textContent ?? "Copy rubric";
  button.classList.add("is-copied");
  if (label) label.textContent = "Copied!";
  window.setTimeout(() => {
    button.classList.remove("is-copied");
    if (label) label.textContent = original;
  }, 1800);
}

function createCopyButton(rubric: Element): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "betterseqta-rubric-copy-btn";
  button.setAttribute("aria-label", "Copy rubric");
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
    <span class="betterseqta-rubric-copy-label">Copy rubric</span>
  `;

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void copyRubricTable(rubric, button);
  });

  return button;
}

function enhanceRubric(rubric: HTMLElement) {
  if (rubric.hasAttribute(ENHANCED_ATTR)) return;

  const host = document.createElement("div");
  host.className = "betterseqta-rubric-copy-host";
  rubric.parentElement?.insertBefore(host, rubric);
  host.appendChild(rubric);

  const overlay = document.createElement("div");
  overlay.className = "betterseqta-rubric-copy-overlay";
  overlay.appendChild(createCopyButton(rubric));
  host.appendChild(overlay);

  rubric.setAttribute(ENHANCED_ATTR, "true");
}

function enhanceRubrics(root: ParentNode = document) {
  ensureStyles();
  root.querySelectorAll<HTMLElement>(RUBRIC_SELECTOR).forEach(enhanceRubric);
}

function watchRubrics(root: ParentNode) {
  observer?.disconnect();
  enhanceRubrics(root);

  observer = new MutationObserver(() => {
    enhanceRubrics(root);
  });

  observer.observe(root, { childList: true, subtree: true });
}

export function injectRubricCopyButtons() {
  const root =
    document.querySelector("[class*='SelectedAssessment__']") ?? document;
  watchRubrics(root);
}

export function teardownRubricCopyButtons() {
  observer?.disconnect();
  observer = null;
}
