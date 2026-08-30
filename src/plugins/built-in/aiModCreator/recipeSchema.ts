import {
  AI_MOD_SCHEMA_VERSION,
  type GeneratedModDraft,
  type ModOperation,
  type SafeAttributeName,
  type SafeStyleProperty,
  type StoredModRecipe,
} from "./types";
import { assertAdvancedScriptSafe } from "./scriptSafety";
import { aiModLog } from "./logger";
import { stripStyleImportantSuffix } from "./modStyle";

export const SAFE_STYLE_PROPERTIES: readonly SafeStyleProperty[] = [
  "align-items",
  "align-self",
  "aspect-ratio",
  "background",
  "background-color",
  "border",
  "border-color",
  "border-radius",
  "border-style",
  "border-width",
  "bottom",
  "box-shadow",
  "color",
  "cursor",
  "display",
  "flex",
  "flex-direction",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "font-size",
  "font-weight",
  "gap",
  "grid-template-columns",
  "height",
  "justify-content",
  "left",
  "letter-spacing",
  "line-height",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "object-fit",
  "opacity",
  "order",
  "overflow",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "position",
  "right",
  "text-align",
  "text-decoration",
  "top",
  "vertical-align",
  "white-space",
  "width",
  "z-index",
] as const;

const SAFE_STYLE_PROPERTY_SET = new Set<string>(SAFE_STYLE_PROPERTIES);

/** Converts camelCase CSS property names to kebab-case (e.g. flexWrap -> flex-wrap). */
export function normalizeStyleProperty(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.includes("-") && /[A-Z]/.test(trimmed)) {
    return trimmed
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
      .toLowerCase();
  }
  return trimmed.toLowerCase();
}

export const SAFE_ATTRIBUTE_NAMES: readonly SafeAttributeName[] = [
  "aria-label",
  "aria-description",
  "aria-hidden",
  "placeholder",
  "role",
  "title",
] as const;

export const SAFE_INSERT_TAGS = [
  "div",
  "span",
  "p",
  "button",
  "label",
] as const;
export const SAFE_INSERT_POSITIONS = [
  "before",
  "after",
  "prepend",
  "append",
] as const;

const OPERATION_TYPES = new Set([
  "setText",
  "replaceText",
  "setAttribute",
  "setStyle",
  "addClass",
  "removeClass",
  "hide",
  "show",
  "insertText",
]);
const CLASS_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/;
const UNSAFE_STYLE_VALUE =
  /(?:url\s*\(|expression\s*\(|javascript\s*:|@import|[{};]|<\/?style)/i;

const TYPE_ALIASES: Record<string, string> = {
  settext: "setText",
  set_text: "setText",
  replacetext: "replaceText",
  replace_text: "replaceText",
  setattribute: "setAttribute",
  set_attribute: "setAttribute",
  setstyle: "setStyle",
  set_style: "setStyle",
  style: "setStyle",
  addclass: "addClass",
  add_class: "addClass",
  removeclass: "removeClass",
  remove_class: "removeClass",
  inserttext: "insertText",
  insert_text: "insertText",
  hidden: "hide",
  visible: "show",
};

function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return `array(${value.length})`;
  if (typeof value === "object") {
    const preview = JSON.stringify(value);
    return `object ${preview.length > 160 ? `${preview.slice(0, 160)}…` : preview}`;
  }
  return `${typeof value}: ${String(value).slice(0, 120)}`;
}

function coerceString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function normalizeOperationType(value: unknown): string | null {
  const direct = coerceString(value);
  if (direct) {
    if (OPERATION_TYPES.has(direct)) return direct;
    const compact = direct.replace(/[\s_-]+/g, "").toLowerCase();
    const alias = TYPE_ALIASES[compact] ?? TYPE_ALIASES[direct.toLowerCase()];
    if (alias) return alias;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return normalizeOperationType(
      record.type ?? record.name ?? record.action ?? record.op,
    );
  }
  return null;
}

function unwrapKeyedOperation(
  operation: Record<string, unknown>,
): Record<string, unknown> {
  if (operation.type || operation.action || operation.op) return operation;

  const keys = Object.keys(operation).filter((key) => {
    const normalized = normalizeOperationType(key);
    return normalized !== null;
  });
  if (keys.length !== 1) return operation;

  const type = normalizeOperationType(keys[0]);
  const payload = operation[keys[0]];
  if (!type || !payload || typeof payload !== "object" || Array.isArray(payload)) {
    return operation;
  }

  return {
    type,
    ...(payload as Record<string, unknown>),
  };
}

function normalizeOperationRecord(
  value: unknown,
  index: number,
): Record<string, unknown> {
  if (typeof value === "string") {
    throw new Error(
      `Operation #${index + 1} must be an object, received string: ${value.slice(0, 120)}`,
    );
  }

  const operation = asRecord(value, `Operation #${index + 1}`);
  const unwrapped = unwrapKeyedOperation(operation);
  const type = normalizeOperationType(
    unwrapped.type ?? unwrapped.action ?? unwrapped.op ?? unwrapped.operation,
  );
  if (!type) {
    throw new Error(
      `Operation #${index + 1} has an invalid type (received ${describeValue(
        unwrapped.type ?? unwrapped.action ?? unwrapped.op,
      )}). Expected one of: ${[...OPERATION_TYPES].join(", ")}`,
    );
  }

  const selector =
    unwrapped.selector ??
    unwrapped.target ??
    unwrapped.element ??
    unwrapped.query ??
    ":scope";

  return {
    ...unwrapped,
    type,
    selector,
    ...(unwrapped.className === undefined && unwrapped.class !== undefined
      ? { className: unwrapped.class }
      : {}),
    ...(unwrapped.property === undefined &&
    (unwrapped.styleProperty !== undefined || unwrapped.cssProperty !== undefined)
      ? {
          property: unwrapped.styleProperty ?? unwrapped.cssProperty,
        }
      : {}),
    ...(unwrapped.text === undefined && unwrapped.content !== undefined
      ? { text: unwrapped.content }
      : {}),
    ...(unwrapped.value === undefined && unwrapped.styleValue !== undefined
      ? { value: unwrapped.styleValue }
      : {}),
  };
}

function normalizeDraftShape(value: unknown): unknown {
  const draft = asRecord(value, "Generated mod");
  let operations = draft.operations;

  if (operations && typeof operations === "object" && !Array.isArray(operations)) {
    operations = Object.values(operations as Record<string, unknown>);
    aiModLog.warn(
      "recipeSchema",
      "Normalized operations object into an array",
      operations,
    );
  }

  if (!Array.isArray(operations)) {
    throw new Error("Generated mod operations must be a list");
  }

  return {
    ...draft,
    operations: operations.map(normalizeOperationRecord),
  };
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function boundedString(
  value: unknown,
  label: string,
  maxLength: number,
  allowEmpty = false,
): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be text (received ${describeValue(value)})`);
  }
  const result = value.trim();
  if (!allowEmpty && result.length === 0) throw new Error(`${label} is required`);
  if (result.length > maxLength) {
    throw new Error(`${label} is too long (maximum ${maxLength} characters)`);
  }
  return result;
}

function validateRelativeSelector(value: unknown): string {
  const selector = boundedString(value, "Operation selector", 500);
  if (
    selector !== ":scope" &&
    !selector.startsWith(":scope ") &&
    !selector.startsWith(":scope>")
  ) {
    throw new Error("Operation selectors must stay inside :scope");
  }
  if (selector.includes(",") || /(?:^|\s)(?:html|body|:root)(?:\s|$)/i.test(selector)) {
    throw new Error("Operation selector may not escape the selected root");
  }
  return selector;
}

function validateClassName(value: unknown): string {
  const className = boundedString(value, "Class name", 64);
  if (!CLASS_NAME_PATTERN.test(className)) {
    throw new Error("Class name contains unsupported characters");
  }
  return className;
}

function validateOperation(value: unknown): ModOperation {
  const operation = asRecord(value, "Operation");
  const type = boundedString(operation.type, "Operation type", 40);
  if (!OPERATION_TYPES.has(type)) {
    throw new Error(`Unsupported operation type: ${type}`);
  }
  const selector = validateRelativeSelector(operation.selector);

  switch (type) {
    case "setText":
      return {
        type,
        selector,
        text: boundedString(operation.text, "Text", 2_000, true),
      };
    case "replaceText":
      return {
        type,
        selector,
        search: boundedString(operation.search, "Search text", 500),
        replacement: boundedString(
          operation.replacement,
          "Replacement text",
          2_000,
          true,
        ),
        ...(operation.all === true ? { all: true } : {}),
      };
    case "setAttribute": {
      const name = boundedString(operation.name, "Attribute name", 40);
      if (!SAFE_ATTRIBUTE_NAMES.includes(name as SafeAttributeName)) {
        throw new Error(`Unsafe attribute: ${name}`);
      }
      return {
        type,
        selector,
        name: name as SafeAttributeName,
        value: boundedString(operation.value, "Attribute value", 1_000, true),
      };
    }
    case "setStyle": {
      const rawProperty = boundedString(operation.property, "Style property", 60);
      const property = normalizeStyleProperty(rawProperty);
      if (!SAFE_STYLE_PROPERTY_SET.has(property)) {
        throw new Error(`Unsafe style property: ${rawProperty}`);
      }
      const styleValue = stripStyleImportantSuffix(
        boundedString(operation.value, "Style value", 200, true),
      );
      if (UNSAFE_STYLE_VALUE.test(styleValue)) {
        throw new Error("Style value contains unsafe content");
      }
      const important =
        operation.important === undefined
          ? undefined
          : operation.important === true;
      return {
        type,
        selector,
        property: property as SafeStyleProperty,
        value: styleValue,
        ...(important === undefined ? {} : { important }),
      };
    }
    case "addClass":
    case "removeClass":
      return {
        type,
        selector,
        className: validateClassName(operation.className),
      };
    case "hide":
    case "show":
      return { type, selector };
    case "insertText": {
      const position = boundedString(operation.position, "Insert position", 20);
      const tag = boundedString(operation.tag, "Insert tag", 20);
      if (!SAFE_INSERT_POSITIONS.includes(position as never)) {
        throw new Error(`Unsafe insert position: ${position}`);
      }
      if (!SAFE_INSERT_TAGS.includes(tag as never)) {
        throw new Error(`Unsafe insert tag: ${tag}`);
      }
      return {
        type,
        selector,
        position: position as "before" | "after" | "prepend" | "append",
        tag: tag as "div" | "span" | "p" | "button" | "label",
        text: boundedString(operation.text, "Inserted text", 2_000, true),
        ...(operation.className === undefined
          ? {}
          : { className: validateClassName(operation.className) }),
      };
    }
  }

  throw new Error("Unsupported operation");
}

function describeOperationPreview(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "unknown operation";
  }
  const operation = value as Record<string, unknown>;
  const type =
    operation.type ??
    operation.action ??
    operation.op ??
    Object.keys(operation).find((key) => normalizeOperationType(key) !== null) ??
    "unknown";
  const selector =
    operation.selector ??
    operation.target ??
    operation.element ??
    operation.query ??
    ":scope";
  return `${String(type)} → ${String(selector).slice(0, 80)}`;
}

export function formatRecipeValidationError(error: unknown): string {
  const base =
    error instanceof Error ? error.message : "Recipe validation failed";
  if (base.startsWith("Recipe validation failed:")) {
    return base;
  }

  const suggestions: string[] = [];
  const unsafeStyle = base.match(/Unsafe style property:\s*(.+)/i);
  if (unsafeStyle) {
    const property = unsafeStyle[1].trim();
    suggestions.push(
      `"${property}" is not allowed. Supported style properties include ${SAFE_STYLE_PROPERTIES.slice(0, 10).join(", ")}, and more.`,
    );
    suggestions.push(
      "For layout changes, try display, flex-wrap, align-items, justify-content, gap, or grid-template-columns.",
    );
  }
  if (/Unsafe attribute:/i.test(base)) {
    suggestions.push(
      `Allowed attributes: ${SAFE_ATTRIBUTE_NAMES.join(", ")}.`,
    );
  }
  if (/selectors must stay inside :scope/i.test(base)) {
    suggestions.push(
      'Selectors must start with :scope (for example ":scope" or ":scope .child").',
    );
  }
  if (/invalid JSON/i.test(base)) {
    suggestions.push("Try regenerating the mod or switching to a different model.");
  }
  if (/at least one operation/i.test(base)) {
    suggestions.push(
      "Describe a concrete DOM change such as hiding an element, changing color, or rounding corners.",
    );
  }
  if (/Unsupported operation type:/i.test(base)) {
    suggestions.push(
      "Supported operations: setText, replaceText, setAttribute, setStyle, addClass, removeClass, hide, show, insertText.",
    );
  }

  if (suggestions.length === 0) {
    return `Recipe validation failed: ${base}`;
  }

  return `Recipe validation failed: ${base} — ${suggestions.join(" ")}`;
}

function validateDraft(value: unknown): GeneratedModDraft {
  const normalized = normalizeDraftShape(value);
  const draft = asRecord(normalized, "Generated mod");
  if (!Array.isArray(draft.operations)) {
    throw new Error("Generated mod operations must be a list");
  }
  if (draft.operations.length > 30) {
    throw new Error("Generated mod may contain at most 30 operations");
  }

  const operations = draft.operations.map((operation, index) => {
    try {
      return validateOperation(operation);
    } catch (cause) {
      const detail =
        cause instanceof Error ? cause.message : "Invalid operation";
      throw new Error(
        `Operation #${index + 1} (${describeOperationPreview(operation)}): ${detail}`,
      );
    }
  });
  const advancedScript =
    draft.advancedScript === undefined ||
    (typeof draft.advancedScript === "string" &&
      draft.advancedScript.trim().length === 0)
      ? undefined
      : assertAdvancedScriptSafe(draft.advancedScript);

  if (operations.length === 0 && !advancedScript) {
    throw new Error(
      "Generated mod must include at least one operation or an advancedScript",
    );
  }

  return {
    name: boundedString(draft.name, "Mod name", 120),
    description: boundedString(
      draft.description,
      "Mod description",
      500,
      true,
    ),
    operations,
    ...(advancedScript === undefined ? {} : { advancedScript }),
  };
}

export function extractJsonFromModelText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export function parseGeneratedModDraft(
  input: string | GeneratedModDraft,
): GeneratedModDraft {
  let parsed: unknown;
  if (typeof input === "string") {
    const normalized = extractJsonFromModelText(input);
    if (normalized.length > 50_000) {
      throw new Error("Generated response is too large");
    }
    try {
      parsed = JSON.parse(normalized);
    } catch {
      aiModLog.error("recipeSchema", "Model returned invalid JSON", normalized);
      throw new Error("The model returned invalid JSON");
    }
  } else {
    parsed = input;
  }

  try {
    const draft = validateDraft(parsed);
    aiModLog.info("recipeSchema", "Validated generated mod draft", {
      name: draft.name,
      operationCount: draft.operations.length,
      hasAdvancedScript: Boolean(draft.advancedScript),
    });
    return draft;
  } catch (error) {
    aiModLog.error("recipeSchema", "Recipe validation failed", {
      parsed,
      error,
    });
    throw error;
  }
}

export function createStoredRecipe(
  draft: GeneratedModDraft,
  input: {
    rootSelector: string;
    route: string;
    now?: number;
    id?: string;
  },
): StoredModRecipe {
  const validated = validateDraft(draft);
  const now = input.now ?? Date.now();
  const generatedId =
    input.id ??
    globalThis.crypto?.randomUUID?.() ??
    `mod-${now}-${Math.random().toString(36).slice(2, 10)}`;

  return validateStoredRecipe({
    ...validated,
    schemaVersion: AI_MOD_SCHEMA_VERSION,
    id: generatedId,
    enabled: false,
    route: input.route,
    rootSelector: input.rootSelector,
    createdAt: now,
    updatedAt: now,
  });
}

function validateStoredRecipe(value: unknown): StoredModRecipe {
  const recipe = asRecord(value, "Stored mod");
  if (recipe.schemaVersion !== AI_MOD_SCHEMA_VERSION) {
    throw new Error("Unsupported mod schema version");
  }
  const draft = validateDraft(recipe);
  const id = boundedString(recipe.id, "Mod id", 160);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error("Mod id contains unsupported characters");
  }
  const rootSelector = boundedString(recipe.rootSelector, "Root selector", 1_000);
  if (/^(?:html|body|:root|\*)$/i.test(rootSelector)) {
    throw new Error("Root selector is too broad");
  }
  const createdAt = Number(recipe.createdAt);
  const updatedAt = Number(recipe.updatedAt);
  if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) {
    throw new Error("Mod timestamps are invalid");
  }
  return {
    ...draft,
    schemaVersion: AI_MOD_SCHEMA_VERSION,
    id,
    enabled: recipe.enabled === true,
    route: boundedString(recipe.route, "Route", 256, true),
    rootSelector,
    createdAt,
    updatedAt,
  };
}

export function parseStoredRecipes(json: string): StoredModRecipe[] {
  if (json.length > 500_000) throw new Error("Import file is too large");
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Import file is not valid JSON");
  }
  if (!Array.isArray(parsed)) throw new Error("Import must contain a mod list");
  if (parsed.length > 100) throw new Error("At most 100 mods can be imported");
  return parsed.map(validateStoredRecipe);
}

export function validateStoredRecipes(value: unknown): StoredModRecipe[] {
  return parseStoredRecipes(JSON.stringify(value));
}
