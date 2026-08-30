import {
  SAFE_ATTRIBUTE_NAMES,
  SAFE_INSERT_TAGS,
  SAFE_STYLE_PROPERTIES,
  validateStoredRecipes,
} from "@/plugins/built-in/aiModCreator/recipeSchema";
import { assertAdvancedScriptSafe } from "@/plugins/built-in/aiModCreator/scriptSafety";
import type { StoredModRecipe } from "@/plugins/built-in/aiModCreator/types";

interface UserScriptsApi {
  configureWorld(details: {
    worldId: string;
    csp: string;
    messaging: boolean;
  }): Promise<void>;
  execute(details: {
    target: { tabId: number; allFrames: boolean };
    worldId: string;
    world: "USER_SCRIPT";
    injectImmediately: boolean;
    js: Array<{ code: string }>;
  }): Promise<unknown>;
}

const USER_SCRIPT_CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'none'",
  "img-src 'none'",
  "media-src 'none'",
  "font-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "child-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

function getUserScriptsApi(): UserScriptsApi {
  const globalApis = globalThis as unknown as {
    chrome?: { userScripts?: UserScriptsApi };
    browser?: { userScripts?: UserScriptsApi };
  };
  const api =
    globalApis.chrome?.userScripts ?? globalApis.browser?.userScripts;
  if (!api?.execute || !api.configureWorld) {
    throw new Error(
      "Advanced scripts require Chrome User Scripts support.",
    );
  }
  return api;
}

export const ADVANCED_SCRIPT_SETUP_INSTRUCTIONS = [
  "Open chrome://extensions",
  "Find BetterSEQTA+ and open Details",
  'Enable "Allow User Scripts"',
  "Reload this SEQTA tab, then enable the mod again",
].join("\n");

export function getAdvancedScriptSupport(): {
  supported: boolean;
  reason?: string;
  instructions?: string;
} {
  try {
    getUserScriptsApi();
    return { supported: true };
  } catch (error) {
    return {
      supported: false,
      reason:
        error instanceof Error
          ? error.message
          : "Advanced scripts are unavailable in this browser",
      instructions: ADVANCED_SCRIPT_SETUP_INSTRUCTIONS,
    };
  }
}

function worldId(id: string): string {
  return `bsplus-${id}`.slice(0, 256);
}

export function buildExecutionSource(recipe: StoredModRecipe): string {
  const script = assertAdvancedScriptSafe(recipe.advancedScript);
  const config = JSON.stringify({
    id: recipe.id,
    route: recipe.route,
    rootSelector: recipe.rootSelector,
    allowedAttributes: SAFE_ATTRIBUTE_NAMES,
    allowedStyles: SAFE_STYLE_PROPERTIES,
    allowedTags: SAFE_INSERT_TAGS,
  });

  return `(() => {
    "use strict";
    const config = ${config};
    const registryKey = Symbol.for("betterseqta.aiModRuntime");
    const registry = globalThis[registryKey] ?? (globalThis[registryKey] = new Map());
    const previousCleanup = registry.get(config.id);
    if (typeof previousCleanup === "function") previousCleanup();

    const route = (location.hash.split("?page=/")[1] ?? "").split(/[/?#]/)[0];
    if (config.route && route !== config.route) {
      throw new Error("AI mod route mismatch: expected " + config.route + " but page is " + route);
    }
    const root = document.querySelector(config.rootSelector);
    if (!(root instanceof HTMLElement)) {
      throw new Error("AI mod root not found on this page: " + config.rootSelector);
    }

    const cleanups = [];
    const remember = (cleanup) => {
      if (typeof cleanup === "function") cleanups.push(cleanup);
      return cleanup;
    };
    const insideRoot = (element) =>
      element instanceof Element && (element === root || root.contains(element));
    const requireInsideRoot = (element) => {
      if (!insideRoot(element)) throw new Error("AI mod attempted to leave its selected root");
      return element;
    };
    const query = (selector = ":scope") =>
      selector === ":scope" ? root : root.querySelector(selector);
    const queryAll = (selector = ":scope") =>
      selector === ":scope" ? [root] : Array.from(root.querySelectorAll(selector));

    const bsplus = Object.freeze({
      root,
      select: query,
      selectAll: queryAll,
      onCleanup: remember,
      setText(element, text) {
        requireInsideRoot(element);
        const previous = element.textContent;
        element.textContent = String(text);
        remember(() => { element.textContent = previous; });
        return element;
      },
      setStyle(element, property, value) {
        requireInsideRoot(element);
        if (!config.allowedStyles.includes(property)) throw new Error("Unsupported style property");
        const previous = element.style.getPropertyValue(property);
        const priority = element.style.getPropertyPriority(property);
        element.style.setProperty(property, String(value).replace(/\\s*!important\\s*$/i, "").trim(), "important");
        remember(() => previous
          ? element.style.setProperty(property, previous, priority)
          : element.style.removeProperty(property));
        return element;
      },
      setAttribute(element, name, value) {
        requireInsideRoot(element);
        if (!config.allowedAttributes.includes(name)) throw new Error("Unsupported attribute");
        const hadAttribute = element.hasAttribute(name);
        const previous = element.getAttribute(name);
        element.setAttribute(name, String(value));
        remember(() => hadAttribute
          ? element.setAttribute(name, previous ?? "")
          : element.removeAttribute(name));
        return element;
      },
      create(tag, text, parent = root) {
        requireInsideRoot(parent);
        if (!config.allowedTags.includes(tag)) throw new Error("Unsupported element tag");
        const element = document.createElement(tag);
        element.textContent = String(text);
        parent.append(element);
        remember(() => element.remove());
        return element;
      },
      on(element, event, handler, options) {
        requireInsideRoot(element);
        element.addEventListener(event, handler, options);
        remember(() => element.removeEventListener(event, handler, options));
      },
      observe(element, callback, options = { childList: true, subtree: true }) {
        requireInsideRoot(element);
        const observer = new MutationObserver(callback);
        observer.observe(element, options);
        remember(() => observer.disconnect());
        return observer;
      },
    });

    const select = bsplus.select;
    const selectAll = bsplus.selectAll;

    let disposed = false;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      for (const callback of cleanups.reverse()) {
        try { callback(); } catch (error) { console.warn("[BetterSEQTA+ AI Mod] Cleanup failed", error); }
      }
      registry.delete(config.id);
    };

    try {
      const userCleanup = (() => {
${script}
      })();
      remember(userCleanup);
      registry.set(config.id, cleanup);
      return { ok: true };
    } catch (error) {
      cleanup();
      throw error;
    }
  })();`;
}

function buildStopSource(id: string): string {
  return `(() => {
    const registry = globalThis[Symbol.for("betterseqta.aiModRuntime")];
    const cleanup = registry?.get(${JSON.stringify(id)});
    if (typeof cleanup === "function") cleanup();
  })();`;
}

async function configureWorld(api: UserScriptsApi, id: string): Promise<void> {
  try {
    await api.configureWorld({
      worldId: worldId(id),
      csp: USER_SCRIPT_CSP,
      messaging: false,
    });
  } catch (error) {
    throw new Error(
      `Could not configure the isolated script world: ${
        error instanceof Error ? error.message : "browser rejected it"
      }`,
    );
  }
}

async function executeSource(
  api: UserScriptsApi,
  id: string,
  tabId: number,
  source: string,
): Promise<void> {
  await configureWorld(api, id);
  const results = (await api.execute({
    target: { tabId, allFrames: false },
    world: "USER_SCRIPT",
    worldId: worldId(id),
    injectImmediately: true,
    js: [{ code: source }],
  })) as Array<{ result?: unknown; error?: unknown }> | undefined;

  const injectionError = results?.find((entry) => entry.error)?.error;
  if (injectionError) {
    throw new Error(
      injectionError instanceof Error
        ? injectionError.message
        : String(injectionError),
    );
  }
}

export async function executeAdvancedMod(
  input: StoredModRecipe,
  tabId: number,
): Promise<void> {
  const support = getAdvancedScriptSupport();
  if (!support.supported) {
    throw new Error(
      `${support.reason ?? "Advanced scripts are unavailable"}\n\n${support.instructions ?? ADVANCED_SCRIPT_SETUP_INSTRUCTIONS}`,
    );
  }
  const [recipe] = validateStoredRecipes([input]);
  if (!recipe.advancedScript) return;
  await executeSource(
    getUserScriptsApi(),
    recipe.id,
    tabId,
    buildExecutionSource(recipe),
  );
}

export async function stopAdvancedMod(
  id: string,
  tabId: number,
): Promise<void> {
  const support = getAdvancedScriptSupport();
  if (!support.supported) return;
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) throw new Error("Invalid mod id");
  await executeSource(getUserScriptsApi(), id, tabId, buildStopSource(id));
}
