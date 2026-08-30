import {
  SAFE_ATTRIBUTE_NAMES,
  SAFE_INSERT_POSITIONS,
  SAFE_INSERT_TAGS,
  SAFE_STYLE_PROPERTIES,
} from "./recipeSchema";
import type { SelectedElementContext } from "./types";

const operationSchemas = [
  {
    type: "object",
    additionalProperties: false,
    required: ["type", "selector", "text"],
    properties: {
      type: { const: "setText" },
      selector: { type: "string" },
      text: { type: "string" },
    },
  },
  {
    type: "object",
    additionalProperties: false,
    required: ["type", "selector", "search", "replacement"],
    properties: {
      type: { const: "replaceText" },
      selector: { type: "string" },
      search: { type: "string" },
      replacement: { type: "string" },
      all: { type: "boolean" },
    },
  },
  {
    type: "object",
    additionalProperties: false,
    required: ["type", "selector", "name", "value"],
    properties: {
      type: { const: "setAttribute" },
      selector: { type: "string" },
      name: { type: "string", enum: SAFE_ATTRIBUTE_NAMES },
      value: { type: "string" },
    },
  },
  {
    type: "object",
    additionalProperties: false,
    required: ["type", "selector", "property", "value"],
    properties: {
      type: { const: "setStyle" },
      selector: { type: "string" },
      property: { type: "string", enum: SAFE_STYLE_PROPERTIES },
      value: { type: "string" },
    },
  },
  ...(["addClass", "removeClass"] as const).map((type) => ({
    type: "object",
    additionalProperties: false,
    required: ["type", "selector", "className"],
    properties: {
      type: { const: type },
      selector: { type: "string" },
      className: { type: "string" },
    },
  })),
  ...(["hide", "show"] as const).map((type) => ({
    type: "object",
    additionalProperties: false,
    required: ["type", "selector"],
    properties: {
      type: { const: type },
      selector: { type: "string" },
    },
  })),
  {
    type: "object",
    additionalProperties: false,
    required: ["type", "selector", "position", "tag", "text"],
    properties: {
      type: { const: "insertText" },
      selector: { type: "string" },
      position: { type: "string", enum: SAFE_INSERT_POSITIONS },
      tag: { type: "string", enum: SAFE_INSERT_TAGS },
      text: { type: "string" },
      className: { type: "string" },
    },
  },
];

export const AI_MOD_RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "description", "operations"],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 120 },
    description: { type: "string", maxLength: 500 },
    operations: {
      type: "array",
      minItems: 0,
      maxItems: 30,
      items: { oneOf: operationSchemas },
    },
    advancedScript: {
      type: "string",
      minLength: 1,
      maxLength: 20_000,
    },
  },
} as const;

export function buildAiModMessages(context: SelectedElementContext) {
  const allowedStyleProperties = SAFE_STYLE_PROPERTIES.join(", ");

  return [
    {
      role: "system",
      content: `You create advanced BetterSEQTA+ DOM mods.
Return only a valid JSON object with keys: name, description, operations, and optionally advancedScript.
Each operation must be an object with a string "type" field and a "selector" field.
Supported type values: setText, replaceText, setAttribute, setStyle, addClass, removeClass, hide, show, insertText.
operations may be an empty array when advancedScript alone implements the requested change.

setStyle rules:
- Use kebab-case property names only (e.g. "flex-wrap", not "flexWrap").
- Allowed properties: ${allowedStyleProperties}
- Do not use background-image, transform, animation, or any property not in the allowed list.
- setStyle operations automatically override BetterSEQTA page CSS (including rules with !important). Target constraining ancestors, not only leaf nodes — e.g. for full-width news cards set max-width, width, margin, and padding on :scope > div.home-container (BS+ caps it at 1050px), not only on .NewsArticle children.

Example (full-width layout — override BS+ container cap):
{"name":"Full-width news","description":"Expands home container to viewport width","operations":[{"type":"setStyle","selector":":scope > div.home-container","property":"max-width","value":"100%"},{"type":"setStyle","selector":":scope > div.home-container","property":"width","value":"100%"},{"type":"setStyle","selector":":scope > div.home-container","property":"margin-left","value":"0"},{"type":"setStyle","selector":":scope > div.home-container","property":"margin-right","value":"0"}]}

Example (simple style):
{"name":"Rounded card","description":"Adds rounded corners","operations":[{"type":"setStyle","selector":":scope","property":"border-radius","value":"12px"}]}

Example (flex row layout):
{"name":"Flex toolbar","description":"Lays out children in a horizontal row","operations":[{"type":"setStyle","selector":":scope","property":"display","value":"flex"},{"type":"setStyle","selector":":scope","property":"align-items","value":"center"},{"type":"setStyle","selector":":scope","property":"gap","value":"8px"},{"type":"setStyle","selector":":scope","property":"flex-wrap","value":"wrap"}]}

Example (CSS grid layout):
{"name":"Grid cards","description":"Displays children in a responsive grid","operations":[{"type":"setStyle","selector":":scope","property":"display","value":"grid"},{"type":"setStyle","selector":":scope","property":"grid-template-columns","value":"repeat(auto-fill, minmax(200px, 1fr))"},{"type":"setStyle","selector":":scope","property":"gap","value":"12px"}]}

Example (table to grid — convert a table container to grid while keeping child cells):
{"name":"Table as grid","description":"Replaces table layout with CSS grid on the wrapper","operations":[{"type":"setStyle","selector":":scope","property":"display","value":"grid"},{"type":"setStyle","selector":":scope","property":"grid-template-columns","value":"repeat(3, 1fr)"},{"type":"setStyle","selector":":scope","property":"gap","value":"8px"},{"type":"setStyle","selector":":scope tr","property":"display","value":"contents"},{"type":"setStyle","selector":":scope td, :scope th","property":"display","value":"block"}]}
For table-to-grid mods, target the table or tbody with display:grid and use display:contents on tr rows so td/th become direct grid items. Use advancedScript when row/column reordering or cell merging is required.

Advanced-only example:
{"name":"Reorder header","description":"Moves child nodes","operations":[],"advancedScript":"return () => {};"}
Every selector must be ":scope" or begin with ":scope " / ":scope>" so it stays inside the user's selected root.
Use domCatalog for exact relative selectors, sibling order, and computed layout on each node.
Use parentChain to understand how the selected root is nested inside parent containers.
Use structuralHints (hasTable, rowCount, columnCount, hasList, itemCount, primaryClasses) for table/list/grid transforms.
Use ancestorHtml to see how the selected root sits inside its parent container.
Use selectedHtml for full subtree markup including preserved inline layout styles.
Select the smallest page area that actually contains the elements you need to change. Do not select BetterSEQTA+ overlay UI; select the underlying SEQTA content instead.
When moving elements, preserve BetterSEQTA+ styling: prefer flex rows with align-items:center, gap, inline-block badges, var(--text-primary), var(--auto-background), and transparent/theme borders over solid black boxes.
If required elements are missing inside root, throw an Error explaining which selector failed.
Use operations for simple reversible changes and advancedScript for richer JavaScript behavior.
advancedScript runs with root, bsplus, and shorthand helpers select(selector) / selectAll(selector) in scope.
The helper library provides select(selector), selectAll(selector), setText(element,text), setStyle(element,property,value), setAttribute(element,name,value), create(tag,text,parent), on(element,event,handler), observe(element,callback,options), and onCleanup(callback).
You may call select() directly or use bsplus.select().
The advancedScript body must return a cleanup function and should use bsplus helpers so disabling the mod restores the page.
Never use network APIs, extension APIs, browser storage, cookies, navigation, raw HTML markup, eval, dynamic imports, workers, programmatic clicks/submits, src/href assignments, or unbounded loops.
You may clear a container with element.innerHTML = '' before moving existing nodes, but never assign HTML strings or use outerHTML/insertAdjacentHTML.
Prefer appendChild, insertBefore, replaceChildren, cloneNode, remove, and textContent for DOM changes.
Direct DOM APIs are allowed for advanced layout and interaction work, but keep every change within root and register cleanup.
Prefer the smallest set of reversible operations. Do not invent page content that is not requested.
For insertText, "before" and "after" may only target descendants, not :scope itself.`,
    },
    {
      role: "user",
      content: `Create a mod for this explicitly selected page area:\n${JSON.stringify(
        context,
        null,
        2,
      )}`,
    },
  ] as const;
}
