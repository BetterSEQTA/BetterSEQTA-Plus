import browser from "webextension-polyfill";
import {
  formatRecipeValidationError,
  parseGeneratedModDraft,
} from "./recipeSchema";
import { aiModLog } from "./logger";
import {
  deleteStoredMod,
  exportStoredMods,
  importStoredMods,
  loadStoredMods,
  setStoredModEnabled,
  upsertStoredMod,
} from "./storage";
import type {
  AdvancedScriptSupport,
  CreatorServices,
  GeneratedModDraft,
  GenerationProgress,
  KeyStatus,
  ModelSettings,
  SelectedElementContext,
} from "./types";

const AI_MOD_CREATOR_MESSAGE_TYPE = "aiModCreator";

interface MessageResponse {
  success?: boolean;
  data?: unknown;
  error?: unknown;
}

async function sendBackgroundMessage(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<unknown> {
  aiModLog.debug("services", `Sending background message: ${action}`, payload);
  const response = (await browser.runtime.sendMessage({
    type: AI_MOD_CREATOR_MESSAGE_TYPE,
    action,
    ...payload,
  })) as MessageResponse | undefined;
  if (!response?.success) {
    const error =
      typeof response?.error === "string"
        ? response.error
        : "AI Mod Creator background service is unavailable";
    aiModLog.error("services", `Background message failed: ${action}`, error);
    throw new Error(error);
  }
  aiModLog.debug("services", `Background message succeeded: ${action}`, response.data);
  return response.data;
}

function streamGeneration(
  context: SelectedElementContext,
  onProgress?: (progress: GenerationProgress) => void,
) {
  return new Promise<ReturnType<typeof parseGeneratedModDraft>>(
    (resolve, reject) => {
      aiModLog.info("services", "Opening streaming generation port", {
        route: context.route,
        rootSelector: context.rootSelector,
        request: context.request,
      });
      const port = browser.runtime.connect({ name: "aiModCreator.stream" });
      let settled = false;
      port.onMessage.addListener(
        (message: {
          type?: string;
          progress?: GenerationProgress;
          draft?: unknown;
          error?: unknown;
        }) => {
          if (message.type === "progress" && message.progress) {
            aiModLog.debug("services", "Stream progress", message.progress);
            onProgress?.(message.progress);
          } else if (message.type === "done") {
            settled = true;
            aiModLog.info("services", "Stream completed", message.draft);
            try {
              resolve(parseGeneratedModDraft(message.draft as GeneratedModDraft));
            } catch (error) {
              const formatted = formatRecipeValidationError(error);
              aiModLog.error("services", "Failed to validate streamed draft", {
                draft: message.draft,
                error: formatted,
              });
              reject(new Error(formatted));
            }
          } else if (message.type === "error") {
            settled = true;
            const errorMessage =
              typeof message.error === "string"
                ? message.error
                : "AI streaming failed";
            aiModLog.error("services", "Stream error from background", errorMessage);
            reject(new Error(errorMessage));
          }
        },
      );
      port.onDisconnect.addListener(() => {
        if (!settled) {
          aiModLog.error("services", "Streaming port disconnected early");
          reject(new Error("AI streaming connection closed"));
        }
      });
      port.postMessage({ context });
    },
  );
}

export function createCreatorServices(): CreatorServices {
  return {
    async getKeyStatus() {
      const data = await sendBackgroundMessage("status");
      if (
        !data ||
        typeof data !== "object" ||
        typeof (data as KeyStatus).configured !== "boolean"
      ) {
        throw new Error("Invalid API key status response");
      }
      return { configured: (data as KeyStatus).configured };
    },
    async getModelSettings() {
      const data = await sendBackgroundMessage("getModel");
      if (
        !data ||
        typeof data !== "object" ||
        typeof (data as ModelSettings).modelId !== "string"
      ) {
        throw new Error("Invalid model settings response");
      }
      return { modelId: (data as ModelSettings).modelId };
    },
    async saveModel(modelId) {
      await sendBackgroundMessage("saveModel", { modelId });
    },
    async getAdvancedScriptSupport() {
      const data = await sendBackgroundMessage("advancedSupport");
      if (
        !data ||
        typeof data !== "object" ||
        typeof (data as AdvancedScriptSupport).supported !== "boolean"
      ) {
        throw new Error("Invalid advanced script support response");
      }
      return data as AdvancedScriptSupport;
    },
    async openExtensionSettings() {
      const extensionId = browser.runtime.id;
      await browser.tabs.create({
        url: `chrome://extensions/?id=${extensionId}`,
      });
    },
    async saveKey(apiKey) {
      await sendBackgroundMessage("saveKey", { apiKey });
    },
    async clearKey() {
      await sendBackgroundMessage("clearKey");
    },
    async generate(context, onProgress) {
      return streamGeneration(context, onProgress);
    },
    loadMods: loadStoredMods,
    saveMod: upsertStoredMod,
    setModEnabled: setStoredModEnabled,
    deleteMod: deleteStoredMod,
    importMods: importStoredMods,
    exportMods: exportStoredMods,
    async executeAdvancedScript(recipe) {
      aiModLog.info("services", "Requesting advanced mod via background", recipe.id);
      await sendBackgroundMessage("executeAdvanced", { recipe });
    },
    async stopAdvancedScript(id) {
      aiModLog.info("services", "Stopping advanced mod via background", id);
      await sendBackgroundMessage("stopAdvanced", { id });
    },
  };
}
