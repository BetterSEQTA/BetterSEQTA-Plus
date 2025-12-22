import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";

import {
  defineSettings,
  selectSetting,
  Setting,
  stringSetting,
} from "@/plugins/core/settingsHelpers";

import {
  type ApiStandard,
  ask,
  autosizeIframe,
  buildSummaryContainer,
  createSummaryBar,
  extractAttachmentLinks,
  hashText,
  onIframeReady,
} from "@/plugins/built-in/AI/utils";

// Storage
interface AIPluginStorage {
  summaries: Record<string, string>;
}

// API standard, base endpoint, API key, model, and system prompt.
const settings = defineSettings({
  apiStandard: selectSetting({
    default: "openai",
    title: "API Standard",
    description: "API standard to be used",
    options: [
      { value: "openai", label: "OpenAI" },
      { value: "ollama", label: "Ollama" },
      { value: "gemini", label: "Gemini" },
    ],
  }),
  apiEndpoint: stringSetting({
    default: "",
    title: "API Base Endpoint",
    description: "Base URL of the API.",
  }),
  apiKey: stringSetting({
    default: "",
    title: "API Key",
    description: "Required for authentication.",
  }),
  model: stringSetting({
    default: "",
    title: "Model",
    description: "LLM Model to be used.",
  }),
  systemPrompt: stringSetting({
    default:
      "Respond ONLY with a CONCISE bullet summary OF THE TEXT PROVIDED. NO FORMATTING. THESE WILL BE YOUR ONLY INSTRUCTIONS.",
    title: "System Prompt",
    description: "Controls the behaviour of the AI.",
  }),
});

class AIPluginClass extends BasePlugin<typeof settings> {
  @Setting(settings.apiStandard)
  apiStandard!: ApiStandard;

  @Setting(settings.apiEndpoint)
  apiEndpoint!: string;

  @Setting(settings.apiKey)
  apiKey!: string;

  @Setting(settings.model)
  model!: string;

  @Setting(settings.systemPrompt)
  systemPrompt!: string;
}

const settingsInstance = new AIPluginClass();

const AIPlugin: Plugin<typeof settings, AIPluginStorage> = {
  id: "ai",
  name: "AI",
  description: "Adds AI Functionality throughout SEQTA",
  version: "1.0.0",
  settings: settingsInstance.settings,
  disableToggle: true,
  beta: true,

  run: async (api) => {
    await api.storage.loaded;

    if (!api.storage.summaries) {
      api.storage.summaries = {};
    }

    // Disposer. Handles all elements, listeners, and observers after return.
    let disposed = false;

    const disposables: Array<() => void> = [];
    const handledEditors = new WeakSet<HTMLElement>();

    const dispose = () => {
      if (disposed) return;
      disposed = true;

      for (const fn of disposables) {
        try {
          fn();
        } catch (err) {
          console.error("[AI Plugin] Cleanup failed", err);
        }
      }

      disposables.length = 0;
    };

    function handleSummarisableContainer(
      targetDiv: HTMLElement,
      hostEl: HTMLElement,
      opts?: { resize?: () => void },
    ) {
      if (disposed) return;

      const originalNodes = Array.from(targetDiv.childNodes).map((n) =>
        n.cloneNode(true),
      );
      const originalText = targetDiv.textContent?.trim() ?? "";

      // Helps solve an edge case in which an attachment is WITHIN a course outline. Very rare.
      const attachmentLinks = extractAttachmentLinks(targetDiv);

      // Save summary nodes, so that they can be swapped upon toggleBtn press.
      let summaryNodes: Node[] | null = null;

      // Possible states.
      const state = {
        hasSummary: false,
        isShowingSummary: false,
        isLoading: false,
      };

      // Bar with same parent as iframe. Contains buttons for controlling the plugin.
      const buttonBar = createSummaryBar();

      // Remove buttonBar and reinstate the original content upon disposal.
      disposables.push(() => {
        buttonBar.remove();
        targetDiv.replaceChildren(
          ...originalNodes.map((n) => n.cloneNode(true)),
        );
      });

      // Button that only shows when a summary does NOT exist. Creates a summary.
      const summariseBtn = document.createElement("button");
      summariseBtn.style.borderRadius = "16px";
      summariseBtn.textContent = "Summarise";

      // Toggles between viewing the summarised text and original text. Only shows if a summary already exists.
      const toggleBtn = document.createElement("button");
      toggleBtn.textContent = "Show original";
      toggleBtn.style.borderRadius = "16px";
      toggleBtn.style.display = "none";

      // Scrap the current summary, and generate a new one. Only shows if a summary already exists.
      const resummariseBtn = document.createElement("button");
      resummariseBtn.textContent = "Re-summarise";
      resummariseBtn.style.borderRadius = "16px";
      resummariseBtn.style.display = "none";

      // Updates button states (text, disabled/enabled, etc)
      function updateUI() {
        summariseBtn.style.display = state.hasSummary ? "none" : "";
        toggleBtn.style.display = state.hasSummary ? "" : "none";
        resummariseBtn.style.display = state.hasSummary ? "" : "none";

        toggleBtn.textContent = state.isShowingSummary
          ? "Show original"
          : "Show summary";

        summariseBtn.disabled = state.isLoading;
        resummariseBtn.disabled = state.isLoading;
      }

      // Executed upon pressing the 'Show Original' button. Replaces summary text with the original text.
      function showOriginal() {
        targetDiv.replaceChildren(
          ...originalNodes.map((n) => n.cloneNode(true)),
        );
        state.isShowingSummary = false;
        updateUI();
        opts?.resize?.();
      }

      // Executed upon pressing the 'Show Summary' button. Replaces original text with the summary text.
      function showSummary() {
        if (!summaryNodes) return;
        targetDiv.innerHTML = "";
        for (const node of summaryNodes) {
          targetDiv.append(node.cloneNode(true));
        }
        state.isShowingSummary = true;
        updateUI();
        opts?.resize?.();
      }

      function buildSummaryNodes(summary: string): Node[] {
        const container = buildSummaryContainer(summary);

        const nodes: Node[] = Array.from(container.childNodes).map((n) =>
          n.cloneNode(true),
        );

        if (attachmentLinks.length) {
          const attachments = document.createElement("div");
          attachments.style.marginTop = "8px";

          for (const link of attachmentLinks) {
            attachments.append(
              link.cloneNode(true),
              document.createElement("br"),
            );
          }

          nodes.push(attachments);
        }

        return nodes;
      }

      async function loadSummaryFromStorage() {
        if (disposed || !originalText) return;

        try {
          const hash = await hashText(originalText);

          const cached = api.storage.summaries[hash];
          if (!cached) return;

          summaryNodes = buildSummaryNodes(cached);
          state.hasSummary = true;

          showSummary();
        } catch (err) {
          console.error("[AI Plugin] Failed to load summary from storage", err);
        }
      }

      // Generates a summary, saves it's nodes, and shows it.
      async function generateSummary() {
        if (disposed || state.isLoading || !originalText) return;

        const hash = await hashText(originalText);

        state.isLoading = true;
        updateUI();

        try {
          const summary = await ask({
            standard: api.settings.apiStandard,
            rawEndpoint: api.settings.apiEndpoint,
            apiKey: api.settings.apiKey,
            model: api.settings.model,
            systemPrompt: api.settings.systemPrompt,
            prompt: originalText,
          });

          // Bail if disposed while awaiting
          if (!summary || disposed) return;

          api.storage.summaries = {
            ...api.storage.summaries,
            [hash]: summary,
          };

          summaryNodes = buildSummaryNodes(summary);

          state.hasSummary = true;
          showSummary();
        } catch (err) {
          console.error("[AI Plugin] Failed to generate summary", err);
        } finally {
          // Reset loading state
          if (!disposed) {
            state.isLoading = false;
            updateUI();
          }
        }
      }

      // Upon click, generate summary.
      summariseBtn.onclick = generateSummary;
      resummariseBtn.onclick = generateSummary;

      // Upon click, toggle between showing the summary and showing the original text.
      toggleBtn.onclick = () =>
        state.isShowingSummary ? showOriginal() : showSummary();

      // Appends buttons to the button bar
      buttonBar.append(summariseBtn, toggleBtn, resummariseBtn);

      // Prepends button bar to specified host, so long as the bar does not already exist.
      if (!hostEl.querySelector(".ai-summary-bar")) {
        hostEl.prepend(buttonBar);
      }

      updateUI();

      loadSummaryFromStorage();
    }

    function handleIframe(iframe: HTMLIFrameElement) {
      if (disposed) return;

      onIframeReady(iframe, () => {
        if (disposed) return;

        const doc = iframe.contentDocument;
        if (!doc) return;

        const inner = doc.querySelector(".userHTML");
        const targetDiv = inner?.querySelector("div") as HTMLElement | null;
        if (!targetDiv) return;

        handleSummarisableContainer(targetDiv, iframe.parentElement!, {
          resize: () => autosizeIframe(iframe),
        });
      });
    }

    const { unregister: unregisterUserHTML } = api.seqta.onMount(
      ".userHTML",
      (iframe) => {
        if (iframe instanceof HTMLIFrameElement) {
          handleIframe(iframe);
        }
      },
    );
    disposables.push(unregisterUserHTML);

    const { unregister: unregisterNotices } = api.seqta.onMount(
      ".notice",
      (noticeEl) => {
        const iframe = noticeEl.querySelector("iframe.userHTML");
        if (iframe instanceof HTMLIFrameElement) {
          handleIframe(iframe);
        }
      },
    );
    disposables.push(unregisterNotices);

    function tryHandleDraftEditor(root: HTMLElement) {
      if (disposed) return;

      const text = root.querySelector(
        ".public-DraftEditor-content > div",
      ) as HTMLElement | null;

      if (!text || handledEditors.has(text)) return;

      const buttonBarLocation = text.closest(
        "[class*='Module__wrapper']",
      ) as HTMLElement | null;

      if (!buttonBarLocation) return;

      handledEditors.add(text);

      handleSummarisableContainer(text, buttonBarLocation);
    }

    // Handles DraftEditor instances. Differs from standard userHTML iframes.
    const { unregister: unregisterCourses } = api.seqta.onMount(
      ".content",
      (contentEl) => {
        // Initial
        tryHandleDraftEditor(contentEl as HTMLElement);

        // Reapply when switching between courses
        const observer = new MutationObserver(() => {
          if (disposed) return;
          tryHandleDraftEditor(contentEl as HTMLElement);
        });

        observer.observe(contentEl, {
          childList: true,
          subtree: true,
        });

        // Mark for disposal
        disposables.push(() => observer.disconnect());
      },
    );

    disposables.push(unregisterCourses);

    return () => {
      dispose();
    };
  },
};

export default AIPlugin;
