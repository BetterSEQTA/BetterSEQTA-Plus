import { buildScopeRelativeSelector } from "./selection";
import type {
  DomElementSummary,
  ParentChainSummary,
  SelectedElementContext,
  StructuralHints,
} from "./types";

const HTML_LIMIT = 24_000;
const ANCESTOR_HTML_LIMIT = 6_000;
const REQUEST_LIMIT = 2_000;
const USER_CONTEXT_LIMIT = 4_000;
const ROUTE_LIMIT = 256;
const DOM_CATALOG_LIMIT = 100;
const DIRECT_TEXT_LIMIT = 120;
const PARENT_CHAIN_LIMIT = 3;
const CLASS_LIMIT = 8;

const COMPUTED_STYLE_PROPERTIES = [
  ["color", "color"],
  ["backgroundColor", "background-color"],
  ["display", "display"],
  ["flexDirection", "flex-direction"],
  ["alignItems", "align-items"],
  ["justifyContent", "justify-content"],
  ["gap", "gap"],
  ["flexWrap", "flex-wrap"],
  ["fontSize", "font-size"],
  ["fontWeight", "font-weight"],
  ["padding", "padding"],
  ["margin", "margin"],
  ["border", "border"],
  ["borderRadius", "border-radius"],
  ["width", "width"],
  ["height", "height"],
  ["textAlign", "text-align"],
  ["opacity", "opacity"],
] as const;

const ALLOWED_INLINE_STYLE =
  /^(display|flex|align-items|justify-content|gap|flex-direction|flex-wrap|text-align|padding|margin|border-radius|opacity|font-size|font-weight|width|height|background-color|color)$/i;

function cap(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function sanitizeInlineStyle(value: string): string {
  return value
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      if (!part.includes(":")) return false;
      const name = part.split(":")[0]?.trim() ?? "";
      return (
        ALLOWED_INLINE_STYLE.test(name) &&
        !/url\s*\(|expression\s*\(|javascript\s*:/i.test(part)
      );
    })
    .join("; ");
}

function sanitizeClone(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll(
      "script,style,noscript,iframe,object,embed,link,meta,template",
    )
    .forEach((node) => node.remove());

  const nodes = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
  for (const node of nodes) {
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase();
      if (
        name.startsWith("on") ||
        name.startsWith("data-") ||
        [
          "action",
          "checked",
          "formaction",
          "href",
          "selected",
          "src",
          "srcset",
          "value",
        ].includes(name)
      ) {
        node.removeAttribute(attribute.name);
        continue;
      }
      if (name === "style") {
        const sanitizedStyle = sanitizeInlineStyle(attribute.value);
        if (sanitizedStyle) node.setAttribute("style", sanitizedStyle);
        else node.removeAttribute("style");
      }
    }
  }
  return clone;
}

function computedStyleSummary(element: HTMLElement): Record<string, string> {
  const style = getComputedStyle(element);
  return Object.fromEntries(
    COMPUTED_STYLE_PROPERTIES.map(([outputName, cssName]) => [
      outputName,
      style.getPropertyValue(cssName) ||
        (style as unknown as Record<string, string>)[outputName] ||
        "",
    ]).filter(([, value]) => value.length > 0),
  );
}

function directText(element: HTMLElement): string | undefined {
  const chunks: string[] = [];
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
      if (text) chunks.push(text);
    }
  }
  if (chunks.length === 0) return undefined;
  return cap(chunks.join(" "), DIRECT_TEXT_LIMIT);
}

function classSummary(element: HTMLElement): string[] {
  return [...element.classList].slice(0, CLASS_LIMIT);
}

function findTable(element: HTMLElement): HTMLTableElement | null {
  if (element instanceof HTMLTableElement) return element;
  return element.querySelector("table");
}

function findList(element: HTMLElement): HTMLUListElement | HTMLOListElement | null {
  if (element instanceof HTMLUListElement || element instanceof HTMLOListElement) {
    return element;
  }
  return element.querySelector("ul, ol");
}

function tableMetrics(
  element: HTMLElement,
): { rowCount: number; columnCount: number } | null {
  const table = findTable(element);
  if (!table) return null;

  const rows = [...table.querySelectorAll("tr")];
  const columnCount = rows.reduce((max, row) => {
    const cells = row.querySelectorAll("td, th").length;
    return Math.max(max, cells);
  }, 0);

  return { rowCount: rows.length, columnCount };
}

function listMetrics(element: HTMLElement): { itemCount: number } | null {
  const list = findList(element);
  if (!list) return null;
  return { itemCount: list.querySelectorAll(":scope > li").length };
}

function buildStructuralHints(element: HTMLElement): StructuralHints {
  const table = tableMetrics(element);
  const list = listMetrics(element);

  return {
    hasTable: table !== null,
    hasList: list !== null,
    ...(table ? table : {}),
    ...(list ? list : {}),
    primaryClasses: classSummary(element),
  };
}

function buildParentChain(element: HTMLElement): ParentChainSummary[] {
  const chain: ParentChainSummary[] = [];
  let current = element.parentElement;

  while (
    current &&
    current !== document.body &&
    current !== document.documentElement &&
    chain.length < PARENT_CHAIN_LIMIT
  ) {
    chain.push({
      tag: current.tagName.toLowerCase(),
      classes: classSummary(current),
      layout: computedStyleSummary(current),
    });
    current = current.parentElement;
  }

  return chain;
}

function rootStructureSummary(
  root: HTMLElement,
): Pick<DomElementSummary, "rowCount" | "columnCount" | "itemCount"> {
  const table = tableMetrics(root);
  const list = listMetrics(root);
  return {
    ...(table ?? {}),
    ...(list ?? {}),
  };
}

function buildDomCatalog(root: HTMLElement): DomElementSummary[] {
  const nodes = [root, ...root.querySelectorAll<HTMLElement>("*")].slice(
    0,
    DOM_CATALOG_LIMIT,
  );

  return nodes.map((node) => {
    const parent = node.parentElement;
    const parentSelector =
      parent && root.contains(parent)
        ? buildScopeRelativeSelector(root, parent)
        : node === root
          ? null
          : ":scope";
    const siblings = parent
      ? [...parent.children].filter((child) => child instanceof HTMLElement)
      : [root];

    const summary: DomElementSummary = {
      selector: buildScopeRelativeSelector(root, node),
      tag: node.tagName.toLowerCase(),
      classes: classSummary(node),
      ...(directText(node) ? { directText: directText(node) } : {}),
      parentSelector,
      siblingIndex: siblings.indexOf(node),
      siblingCount: siblings.length,
      layout: computedStyleSummary(node),
    };

    if (node === root) {
      Object.assign(summary, rootStructureSummary(root));
    }

    return summary;
  });
}

function buildAncestorContext(root: HTMLElement): { ancestorHtml?: string } {
  const parent = root.parentElement;
  if (
    !parent ||
    parent === document.body ||
    parent === document.documentElement
  ) {
    return {};
  }

  return {
    ancestorHtml: sanitizeClone(parent).outerHTML.slice(0, ANCESTOR_HTML_LIMIT),
  };
}

export function buildSelectedElementContext(
  element: HTMLElement,
  input: {
    route: string;
    rootSelector: string;
    request: string;
    userContext: string;
  },
): SelectedElementContext {
  const rect = element.getBoundingClientRect();
  const sanitized = sanitizeClone(element);
  const ancestor = buildAncestorContext(element);
  const parentChain = buildParentChain(element);
  const structuralHints = buildStructuralHints(element);

  return {
    route: cap(input.route, ROUTE_LIMIT),
    rootSelector: cap(input.rootSelector, 1_000),
    request: cap(input.request, REQUEST_LIMIT),
    userContext: cap(input.userContext, USER_CONTEXT_LIMIT),
    selectedHtml: sanitized.outerHTML.slice(0, HTML_LIMIT),
    domCatalog: buildDomCatalog(element),
    ...(ancestor.ancestorHtml ? { ancestorHtml: ancestor.ancestorHtml } : {}),
    ...(parentChain.length > 0 ? { parentChain } : {}),
    structuralHints,
    tagName: element.tagName.toLowerCase(),
    dimensions: {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
    computedStyle: computedStyleSummary(element),
  };
}
