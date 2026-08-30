import browser from "webextension-polyfill";
import {
  buildAiModMessages,
} from "@/plugins/built-in/aiModCreator/prompt";
import {
  formatRecipeValidationError,
  parseGeneratedModDraft,
} from "@/plugins/built-in/aiModCreator/recipeSchema";
import { aiModLog } from "@/plugins/built-in/aiModCreator/logger";
import {
  DEFAULT_OPENROUTER_MODEL_ID,
  getModelOption,
  validateModelId,
} from "@/plugins/built-in/aiModCreator/models";
import {
  OPENROUTER_API_KEY_STORAGE_KEY,
  OPENROUTER_MODEL_STORAGE_KEY,
} from "@/plugins/built-in/aiModCreator/storage";
import {
  executeAdvancedMod,
  getAdvancedScriptSupport,
  stopAdvancedMod,
} from "./aiModUserScripts";
import type {
  GenerationProgress,
  GeneratedModDraft,
  KeyStatus,
  SelectedElementContext,
  StoredModRecipe,
} from "@/plugins/built-in/aiModCreator/types";

export const AI_MOD_CREATOR_MESSAGE_TYPE = "aiModCreator";
export const OPENROUTER_MODEL_ID = DEFAULT_OPENROUTER_MODEL_ID;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MIN_GENERATION_INTERVAL_MS = 5_000;
const ROUTING_ERROR_PATTERN =
  /no endpoints found|can handle the requested parameters/i;

type ResponseFormatMode = "json_object" | "none";

type StorageArea = Pick<
  browser.Storage.StorageArea,
  "get" | "set" | "remove"
>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type SendResponse = (response: unknown) => void;
type TrustCheck = (sender?: browser.Runtime.MessageSender) => boolean;

function validateApiKey(value: unknown): string {
  if (typeof value !== "string") throw new Error("API key is required");
  const key = value.trim();
  if (key.length < 16 || key.length > 512) {
    throw new Error("API key must be between 16 and 512 characters");
  }
  return key;
}

function validateContext(value: unknown): SelectedElementContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Selected element context is required");
  }
  const context = value as SelectedElementContext;
  const limits: Array<[keyof SelectedElementContext, number]> = [
    ["route", 256],
    ["rootSelector", 1_000],
    ["request", 2_000],
    ["userContext", 4_000],
    ["selectedHtml", 24_000],
    ["ancestorHtml", 6_000],
    ["tagName", 80],
  ];
  for (const [key, limit] of limits) {
    const field = context[key];
    if (field === undefined) continue;
    if (typeof field !== "string") throw new Error(`${key} must be text`);
    if (field.length > limit) throw new Error(`${key} is too long`);
  }
  if (!Array.isArray(context.domCatalog)) {
    throw new Error("domCatalog is required");
  }
  if (context.domCatalog.length > 100) {
    throw new Error("domCatalog must contain at most 100 entries");
  }
  for (const entry of context.domCatalog) {
    if (!entry || typeof entry !== "object") {
      throw new Error("domCatalog entries must be objects");
    }
    if (typeof entry.selector !== "string" || entry.selector.length > 500) {
      throw new Error("domCatalog selector is invalid");
    }
    if (typeof entry.tag !== "string" || entry.tag.length > 80) {
      throw new Error("domCatalog tag is invalid");
    }
    if (
      entry.layout &&
      (typeof entry.layout !== "object" ||
        Array.isArray(entry.layout) ||
        Object.keys(entry.layout).length > 24)
    ) {
      throw new Error("domCatalog layout summary is invalid");
    }
    for (const countKey of ["rowCount", "columnCount", "itemCount"] as const) {
      const count = entry[countKey];
      if (count === undefined) continue;
      if (!Number.isFinite(count) || count < 0 || count > 10_000) {
        throw new Error(`domCatalog ${countKey} is invalid`);
      }
    }
  }
  if (context.parentChain !== undefined) {
    if (!Array.isArray(context.parentChain)) {
      throw new Error("parentChain must be an array");
    }
    if (context.parentChain.length > 3) {
      throw new Error("parentChain must contain at most 3 entries");
    }
    for (const entry of context.parentChain) {
      if (!entry || typeof entry !== "object") {
        throw new Error("parentChain entries must be objects");
      }
      if (typeof entry.tag !== "string" || entry.tag.length > 80) {
        throw new Error("parentChain tag is invalid");
      }
      if (!Array.isArray(entry.classes) || entry.classes.length > 8) {
        throw new Error("parentChain classes are invalid");
      }
      for (const className of entry.classes) {
        if (typeof className !== "string" || className.length > 80) {
          throw new Error("parentChain class name is invalid");
        }
      }
      if (
        !entry.layout ||
        typeof entry.layout !== "object" ||
        Array.isArray(entry.layout) ||
        Object.keys(entry.layout).length > 24
      ) {
        throw new Error("parentChain layout summary is invalid");
      }
    }
  }
  if (context.structuralHints !== undefined) {
    const hints = context.structuralHints;
    if (!hints || typeof hints !== "object" || Array.isArray(hints)) {
      throw new Error("structuralHints must be an object");
    }
    if (typeof hints.hasTable !== "boolean" || typeof hints.hasList !== "boolean") {
      throw new Error("structuralHints flags are invalid");
    }
    if (!Array.isArray(hints.primaryClasses) || hints.primaryClasses.length > 8) {
      throw new Error("structuralHints primaryClasses are invalid");
    }
    for (const className of hints.primaryClasses) {
      if (typeof className !== "string" || className.length > 80) {
        throw new Error("structuralHints class name is invalid");
      }
    }
    for (const countKey of ["rowCount", "columnCount", "itemCount"] as const) {
      const count = hints[countKey];
      if (count === undefined) continue;
      if (!Number.isFinite(count) || count < 0 || count > 10_000) {
        throw new Error(`structuralHints ${countKey} is invalid`);
      }
    }
  }
  if (!context.request.trim()) throw new Error("Change request is required");
  if (
    !context.dimensions ||
    !Number.isFinite(context.dimensions.width) ||
    !Number.isFinite(context.dimensions.height)
  ) {
    throw new Error("Element dimensions are invalid");
  }
  if (
    !context.computedStyle ||
    typeof context.computedStyle !== "object" ||
    Array.isArray(context.computedStyle) ||
    Object.keys(context.computedStyle).length > 20
  ) {
    throw new Error("Computed style summary is invalid");
  }
  return {
    ...context,
    dimensions: { ...context.dimensions },
    computedStyle: { ...context.computedStyle },
    domCatalog: context.domCatalog.map((entry) => ({
      ...entry,
      classes: [...entry.classes],
      layout: { ...entry.layout },
    })),
    ...(context.parentChain
      ? {
          parentChain: context.parentChain.map((entry) => ({
            ...entry,
            classes: [...entry.classes],
            layout: { ...entry.layout },
          })),
        }
      : {}),
    ...(context.structuralHints
      ? {
          structuralHints: {
            ...context.structuralHints,
            primaryClasses: [...context.structuralHints.primaryClasses],
          },
        }
      : {}),
  };
}

function responseContent(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new Error("OpenRouter returned an invalid response");
  }
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("OpenRouter returned no choices");
  }
  const content = (
    choices[0] as { message?: { content?: unknown } }
  ).message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const combined = content
      .map((part) =>
        part &&
        typeof part === "object" &&
        "text" in part &&
        typeof part.text === "string"
          ? part.text
          : "",
      )
      .join("");
    if (combined) return combined;
  }
  throw new Error("OpenRouter returned no generated recipe");
}

async function providerError(
  response: Response,
  modelId: string,
): Promise<string> {
  const fallback = `OpenRouter request failed (${response.status})`;
  try {
    const payload = (await response.json()) as {
      error?: { message?: unknown; code?: number; metadata?: { error_type?: string } } | string;
    };
    if (typeof payload.error === "string") {
      return formatOpenRouterError({ message: payload.error }, modelId);
    }
    if (payload.error && typeof payload.error === "object") {
      return formatOpenRouterError(payload.error, modelId);
    }
  } catch {
    // Use the status-only fallback without exposing response content.
  }
  if (response.status === 429) {
    return formatOpenRouterError({ code: 429 }, modelId);
  }
  return fallback;
}

type OpenRouterErrorShape = {
  code?: number;
  message?: string;
  metadata?: { error_type?: string };
};

export function formatOpenRouterError(
  error: OpenRouterErrorShape | undefined,
  modelId: string,
): string {
  if (!error) return "OpenRouter request failed";

  const errorType = error.metadata?.error_type;
  const message = typeof error.message === "string" ? error.message : "";
  const isRateLimit =
    error.code === 429 ||
    errorType === "rate_limit_exceeded" ||
    /rate limit/i.test(message);

  if (isRateLimit) {
    const model = getModelOption(modelId);
    const tierHint =
      model?.tier === "free"
        ? "Free models share strict provider limits — wait 1–2 minutes or switch model in the creator panel."
        : "Wait a minute and try again.";
    return `Rate limit reached for ${model?.label ?? modelId}. ${tierHint}`;
  }

  return message || "OpenRouter request failed";
}

function openRouterRequestBody(
  context: SelectedElementContext,
  stream: boolean,
  formatMode: ResponseFormatMode,
  modelId: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: modelId,
    messages: buildAiModMessages(context),
    temperature: 0.2,
    max_tokens: 8_000,
    stream,
    provider: {
      allow_fallbacks: true,
    },
  };

  if (formatMode === "json_object") {
    body.response_format = { type: "json_object" };
  }

  return body;
}

function openRouterRequestInit(
  apiKey: string,
  context: SelectedElementContext,
  stream: boolean,
  formatMode: ResponseFormatMode,
  modelId: string,
): RequestInit {
  return {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://betterseqta.org",
      "X-Title": "BetterSEQTA+ AI Mod Creator",
    },
    body: JSON.stringify(
      openRouterRequestBody(context, stream, formatMode, modelId),
    ),
  };
}

function isRoutingError(message: string): boolean {
  return ROUTING_ERROR_PATTERN.test(message);
}

function parseValidatedDraft(
  content: string | GeneratedModDraft,
): GeneratedModDraft {
  try {
    return parseGeneratedModDraft(content);
  } catch (error) {
    throw new Error(formatRecipeValidationError(error));
  }
}

async function requestGeneratedDraft(
  fetchImpl: FetchLike,
  apiKey: string,
  context: SelectedElementContext,
  stream: boolean,
  modelId: string,
  onProgress?: (progress: GenerationProgress) => void,
): Promise<GeneratedModDraft> {
  const modes: ResponseFormatMode[] = ["json_object", "none"];
  let lastError = "OpenRouter request failed";
  const modelLabel = getModelOption(modelId)?.label ?? modelId;

  for (const [index, mode] of modes.entries()) {
    if (index > 0) {
      aiModLog.warn("background", "Retrying OpenRouter request", { mode, lastError });
      onProgress?.({
        type: "status",
        text: "Retrying with a simpler OpenRouter request…",
      });
    } else if (stream) {
      onProgress?.({ type: "status", text: `Connecting to ${modelLabel}…` });
    }

    aiModLog.info("background", "Sending OpenRouter request", {
      mode,
      stream,
      model: modelId,
      route: context.route,
      rootSelector: context.rootSelector,
    });

    const response = await fetchImpl(
      OPENROUTER_URL,
      openRouterRequestInit(apiKey, context, stream, mode, modelId),
    );
    if (response.ok) {
      aiModLog.info("background", "OpenRouter request succeeded", {
        mode,
        stream,
        status: response.status,
      });
      if (stream) {
        return consumeOpenRouterStream(
          response,
          modelId,
          onProgress ?? (() => {}),
        );
      }
      const payload = await response.json();
      const content = responseContent(payload);
      aiModLog.debug("background", "OpenRouter non-stream content", content);
      return parseValidatedDraft(content);
    }

    lastError = await providerError(response, modelId);
    aiModLog.warn("background", "OpenRouter request failed", {
      mode,
      stream,
      status: response.status,
      error: lastError,
    });
    if (!isRoutingError(lastError)) break;
  }

  throw new Error(lastError);
}

async function consumeOpenRouterStream(
  response: Response,
  modelId: string,
  onProgress: (progress: GenerationProgress) => void,
): Promise<GeneratedModDraft> {
  if (!response.body) throw new Error("OpenRouter returned an empty stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let generatedContent = "";
  let reasoningStarted = false;

  const processEvent = (event: string) => {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("");
    if (!data || data === "[DONE]") return;

    const chunk = JSON.parse(data) as {
      error?: OpenRouterErrorShape;
      choices?: Array<{
        delta?: {
          content?: string | null;
          reasoning_details?: unknown[];
        };
        error?: OpenRouterErrorShape;
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
      };
    };
    const streamError = chunk.error ?? chunk.choices?.[0]?.error;
    if (streamError) {
      aiModLog.warn("background", "OpenRouter stream error chunk", streamError);
      throw new Error(formatOpenRouterError(streamError, modelId));
    }

    const delta = chunk.choices?.[0]?.delta;
    if (Array.isArray(delta?.reasoning_details) && !reasoningStarted) {
      reasoningStarted = true;
      onProgress({ type: "status", text: "Model is reasoning…" });
    }
    if (typeof delta?.content === "string" && delta.content) {
      generatedContent += delta.content;
      onProgress({ type: "content", text: delta.content });
    }
    if (chunk.usage) {
      onProgress({
        type: "usage",
        promptTokens: chunk.usage.prompt_tokens,
        completionTokens: chunk.usage.completion_tokens,
      });
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";
    for (const event of events) processEvent(event);
    if (done) break;
  }
  if (buffer.trim()) processEvent(buffer);
  aiModLog.debug("background", "Completed OpenRouter stream", {
    contentLength: generatedContent.length,
    preview: generatedContent.slice(0, 500),
  });
  return parseValidatedDraft(generatedContent);
}

export function createAiModCreatorService(
  dependencies: {
    storage?: StorageArea;
    fetchImpl?: FetchLike;
    now?: () => number;
  } = {},
) {
  const storage = dependencies.storage ?? browser.storage.local;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const now = dependencies.now ?? Date.now;
  let inFlight = false;
  let lastGenerationAt = Number.NEGATIVE_INFINITY;

  const getStoredKey = async (): Promise<string | null> => {
    const result = await storage.get(OPENROUTER_API_KEY_STORAGE_KEY);
    const value = result[OPENROUTER_API_KEY_STORAGE_KEY];
    return typeof value === "string" && value.length > 0 ? value : null;
  };

  const getStoredModelId = async (): Promise<string> => {
    const result = await storage.get(OPENROUTER_MODEL_STORAGE_KEY);
    const value = result[OPENROUTER_MODEL_STORAGE_KEY];
    if (typeof value === "string" && value.length > 0) {
      try {
        return validateModelId(value);
      } catch {
        aiModLog.warn("background", "Ignoring invalid stored model id", value);
      }
    }
    return DEFAULT_OPENROUTER_MODEL_ID;
  };

  const beginGeneration = () => {
    const currentTime = now();
    if (inFlight) {
      throw new Error("A generation is already in progress");
    }
    if (currentTime - lastGenerationAt < MIN_GENERATION_INTERVAL_MS) {
      const waitSeconds = Math.ceil(
        (MIN_GENERATION_INTERVAL_MS - (currentTime - lastGenerationAt)) / 1000,
      );
      throw new Error(
        `Please wait ${waitSeconds}s before generating another mod`,
      );
    }
    inFlight = true;
    lastGenerationAt = currentTime;
  };

  return {
    async saveKey(apiKey: unknown): Promise<void> {
      await storage.set({
        [OPENROUTER_API_KEY_STORAGE_KEY]: validateApiKey(apiKey),
      });
    },

    async clearKey(): Promise<void> {
      await storage.remove(OPENROUTER_API_KEY_STORAGE_KEY);
    },

    async getKeyStatus(): Promise<KeyStatus> {
      return { configured: (await getStoredKey()) !== null };
    },

    async getModelSettings() {
      return { modelId: await getStoredModelId() };
    },

    async saveModel(modelId: unknown): Promise<void> {
      await storage.set({
        [OPENROUTER_MODEL_STORAGE_KEY]: validateModelId(modelId),
      });
      aiModLog.info("background", "Saved OpenRouter model", modelId);
    },

    async generate(input: unknown): Promise<GeneratedModDraft> {
      const context = validateContext(input);
      const apiKey = await getStoredKey();
      if (!apiKey) throw new Error("OpenRouter API key is not configured");
      const modelId = await getStoredModelId();
      beginGeneration();

      try {
        return await requestGeneratedDraft(
          fetchImpl,
          apiKey,
          context,
          false,
          modelId,
        );
      } finally {
        inFlight = false;
      }
    },

    async streamGenerate(
      input: unknown,
      onProgress: (progress: GenerationProgress) => void,
    ): Promise<GeneratedModDraft> {
      const context = validateContext(input);
      const apiKey = await getStoredKey();
      if (!apiKey) throw new Error("OpenRouter API key is not configured");
      const modelId = await getStoredModelId();
      beginGeneration();

      try {
        return await requestGeneratedDraft(
          fetchImpl,
          apiKey,
          context,
          true,
          modelId,
          onProgress,
        );
      } finally {
        inFlight = false;
      }
    },
  };
}

const defaultService = createAiModCreatorService();

export function handleAiModCreatorMessage(
  request: {
    type?: string;
    action?: string;
    apiKey?: unknown;
    context?: unknown;
    recipe?: unknown;
    id?: unknown;
    modelId?: unknown;
  },
  sender: browser.Runtime.MessageSender,
  sendResponse: SendResponse,
  isTrustedSender: TrustCheck,
): boolean {
  if (!isTrustedSender(sender)) {
    sendResponse({ success: false, error: "Unauthorized sender" });
    return false;
  }

  const action = request.action;
  aiModLog.debug("background", "Handling message", {
    action,
    tabId: sender.tab?.id,
    senderId: sender.id,
  });
  void (async () => {
    try {
      let data: unknown;
      if (action === "saveKey") {
        await defaultService.saveKey(request.apiKey);
      } else if (action === "clearKey") {
        await defaultService.clearKey();
      } else if (action === "status") {
        data = await defaultService.getKeyStatus();
      } else if (action === "getModel") {
        data = await defaultService.getModelSettings();
      } else if (action === "saveModel") {
        await defaultService.saveModel(request.modelId);
      } else if (action === "advancedSupport") {
        data = getAdvancedScriptSupport();
      } else if (action === "generate") {
        data = await defaultService.generate(request.context);
      } else if (action === "executeAdvanced") {
        if (sender.tab?.id === undefined) {
          throw new Error("Advanced scripts require a SEQTA browser tab");
        }
        const { devMode } = await browser.storage.local.get("devMode");
        if (devMode !== true) {
          throw new Error("Advanced scripts are available only in developer mode");
        }
        await executeAdvancedMod(
          request.recipe as StoredModRecipe,
          sender.tab.id,
        );
      } else if (action === "stopAdvanced") {
        if (sender.tab?.id === undefined || typeof request.id !== "string") {
          throw new Error("Advanced script id or tab is missing");
        }
        await stopAdvancedMod(request.id, sender.tab.id);
      } else {
        throw new Error("Unsupported AI Mod Creator action");
      }
      sendResponse({ success: true, data });
      aiModLog.debug("background", "Message handled", { action });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI request failed";
      aiModLog.error("background", "Message failed", { action, error: message });
      sendResponse({
        success: false,
        error: message,
      });
    }
  })();
  return true;
}

export function registerAiModCreatorStreaming(
  isTrustedSender: TrustCheck,
): void {
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== "aiModCreator.stream") return;
    if (!isTrustedSender(port.sender)) {
      port.postMessage({ type: "error", error: "Unauthorized sender" });
      port.disconnect();
      return;
    }

    let started = false;
    port.onMessage.addListener((message: unknown) => {
      if (started) return;
      started = true;
      const context =
        message && typeof message === "object" && "context" in message
          ? (message as { context?: unknown }).context
          : undefined;
      aiModLog.info("background", "Starting streamed generation");
      void defaultService
        .streamGenerate(context, (progress) => {
          port.postMessage({ type: "progress", progress });
        })
        .then((draft) => {
          aiModLog.info("background", "Streamed generation complete", {
            name: draft.name,
            operationCount: draft.operations.length,
          });
          port.postMessage({ type: "done", draft });
          port.disconnect();
        })
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : "AI streaming failed";
          aiModLog.error("background", "Streamed generation failed", message);
          port.postMessage({
            type: "error",
            error: message,
          });
          port.disconnect();
        });
    });
  });
}
