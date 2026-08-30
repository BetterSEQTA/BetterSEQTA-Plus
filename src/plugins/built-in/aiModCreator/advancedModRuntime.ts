import {
  SAFE_ATTRIBUTE_NAMES,
  SAFE_INSERT_TAGS,
  SAFE_STYLE_PROPERTIES,
  normalizeStyleProperty,
} from "./recipeSchema";
import { assertAdvancedScriptSafe } from "./scriptSafety";
import { applyModStyleProperty, restoreModStyleProperty } from "./modStyle";
import { aiModLog } from "./logger";
import type { StoredModRecipe } from "./types";

/**
 * Test-only runtime. Production uses background User Scripts injection because
 * SEQTA's CSP blocks eval/new Function inside content scripts.
 */

const REGISTRY_KEY = Symbol.for("betterseqta.aiModRuntime");
type Cleanup = () => void;

function getRegistry(): Map<string, Cleanup> {
  const globalScope = globalThis as typeof globalThis & {
    [key: symbol]: Map<string, Cleanup> | undefined;
  };
  if (!globalScope[REGISTRY_KEY]) {
    globalScope[REGISTRY_KEY] = new Map();
  }
  return globalScope[REGISTRY_KEY]!;
}

function currentRoute(): string {
  return (window.location.hash.split("?page=/")[1] ?? "").split(/[/?#]/)[0];
}

function createBsplus(root: HTMLElement, cleanups: Cleanup[]) {
  const remember = (cleanup: unknown) => {
    if (typeof cleanup === "function") cleanups.push(cleanup as Cleanup);
    return cleanup;
  };
  const insideRoot = (element: Element) =>
    element === root || root.contains(element);
  const requireInsideRoot = (element: Element) => {
    if (!insideRoot(element)) {
      throw new Error("AI mod attempted to leave its selected root");
    }
    return element;
  };
  const select = (selector = ":scope") =>
    selector === ":scope"
      ? root
      : root.querySelector<HTMLElement>(selector);
  const selectAll = (selector = ":scope") =>
    selector === ":scope"
      ? [root]
      : Array.from(root.querySelectorAll<HTMLElement>(selector));

  return Object.freeze({
    root,
    select,
    selectAll,
    onCleanup: remember,
    setText(element: HTMLElement, text: string) {
      requireInsideRoot(element);
      const previous = element.textContent;
      element.textContent = String(text);
      remember(() => {
        element.textContent = previous;
      });
      return element;
    },
    setStyle(element: HTMLElement, property: string, value: string) {
      requireInsideRoot(element);
      const normalizedProperty = normalizeStyleProperty(property);
      if (!SAFE_STYLE_PROPERTIES.includes(normalizedProperty as never)) {
        throw new Error("Unsupported style property");
      }
      const snapshot = applyModStyleProperty(
        element,
        normalizedProperty,
        String(value),
        true,
      );
      remember(() =>
        restoreModStyleProperty(element, normalizedProperty, snapshot),
      );
      return element;
    },
    setAttribute(element: HTMLElement, name: string, value: string) {
      requireInsideRoot(element);
      if (!SAFE_ATTRIBUTE_NAMES.includes(name as never)) {
        throw new Error("Unsupported attribute");
      }
      const hadAttribute = element.hasAttribute(name);
      const previous = element.getAttribute(name);
      element.setAttribute(name, String(value));
      remember(() =>
        hadAttribute
          ? element.setAttribute(name, previous ?? "")
          : element.removeAttribute(name),
      );
      return element;
    },
    create(tag: string, text: string, parent: HTMLElement = root) {
      requireInsideRoot(parent);
      if (!SAFE_INSERT_TAGS.includes(tag as never)) {
        throw new Error("Unsupported element tag");
      }
      const element = document.createElement(tag);
      element.textContent = String(text);
      parent.append(element);
      remember(() => element.remove());
      return element;
    },
    on(
      element: HTMLElement,
      event: string,
      handler: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      requireInsideRoot(element);
      element.addEventListener(event, handler, options);
      remember(() => element.removeEventListener(event, handler, options));
    },
    observe(
      element: HTMLElement,
      callback: MutationCallback,
      options: MutationObserverInit = { childList: true, subtree: true },
    ) {
      requireInsideRoot(element);
      const observer = new MutationObserver(callback);
      observer.observe(element, options);
      remember(() => observer.disconnect());
      return observer;
    },
  });
}

export function runAdvancedMod(recipe: StoredModRecipe): void {
  if (!recipe.advancedScript) return;

  stopAdvancedMod(recipe.id);
  const script = assertAdvancedScriptSafe(recipe.advancedScript);

  if (recipe.route && currentRoute() !== recipe.route) {
    aiModLog.debug("runtime", `Skipped mod ${recipe.id} on route ${currentRoute()}`);
    return;
  }

  const root = document.querySelector(recipe.rootSelector);
  if (!(root instanceof HTMLElement)) {
    throw new Error(
      `Selected root not found on this page: ${recipe.rootSelector}`,
    );
  }

  const cleanups: Cleanup[] = [];
  const bsplus = createBsplus(root, cleanups);
  const select = bsplus.select;
  const selectAll = bsplus.selectAll;
  let disposed = false;

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    for (const callback of cleanups.reverse()) {
      try {
        callback();
      } catch (error) {
        aiModLog.warn("runtime", `Cleanup failed for mod ${recipe.id}`, error);
      }
    }
    getRegistry().delete(recipe.id);
  };

  try {
    const runner = new Function(
      "root",
      "bsplus",
      "select",
      "selectAll",
      `"use strict"; return (() => { ${script} })();`,
    ) as (
      root: HTMLElement,
      bsplus: ReturnType<typeof createBsplus>,
      select: typeof bsplus.select,
      selectAll: typeof bsplus.selectAll,
    ) => unknown;

    const userCleanup = runner(root, bsplus, select, selectAll);
    if (typeof userCleanup === "function") {
      cleanups.push(userCleanup as Cleanup);
    }
    getRegistry().set(recipe.id, cleanup);
    aiModLog.info("runtime", `Started advanced mod ${recipe.id}`, recipe.name);
  } catch (error) {
    cleanup();
    throw error;
  }
}

export function stopAdvancedMod(id: string): void {
  const cleanup = getRegistry().get(id);
  if (typeof cleanup === "function") {
    cleanup();
    aiModLog.info("runtime", `Stopped advanced mod ${id}`);
  }
}

export function isAdvancedModRuntimeAvailable(): boolean {
  return typeof document !== "undefined" && typeof Function !== "undefined";
}
