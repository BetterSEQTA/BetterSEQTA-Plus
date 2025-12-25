import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";

import {
  defineSettings,
  selectSetting,
  Setting,
  stringSetting,
  booleanSetting,
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
      { value: "claude", label: "Claude" },
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
  showPreviousSummaries: booleanSetting({
    default: false,
    title: "Show Summaries by Default",
    description: "Show previous summaries by default upon load.",
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

  @Setting(settings.showPreviousSummaries)
  showPreviousSummaries!: boolean;
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
    const handledIframes = new WeakSet<HTMLIFrameElement>();
    const watchedNoticeContainers = new WeakSet<HTMLElement>();
    const watchedNotices = new WeakSet<HTMLElement>();

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
      resolveTarget: () => HTMLElement | null,
      hostEl: HTMLElement,
      opts?: { resize?: () => void },
    ) {
      if (disposed) return;

      const initialTarget = resolveTarget();
      if (!initialTarget) {
        console.warn(
          "[AI Plugin] Unable to locate target for AI summary",
          hostEl,
        );
        return;
      }

      const originalDisplay = initialTarget.style.display;
      const originalNodes = Array.from(initialTarget.childNodes).map((n) =>
        n.cloneNode(true),
      );
      const originalText = initialTarget.textContent?.trim() ?? "";
      const attachmentLinks = extractAttachmentLinks(initialTarget);

      const cloneOriginalNodes = () =>
        originalNodes.map((n) => n.cloneNode(true));

      const getLiveTarget = () => {
        const target = resolveTarget();
        return target?.isConnected ? target : null;
      };

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
        const targetDiv = getLiveTarget();
        if (targetDiv) {
          targetDiv.replaceChildren(...cloneOriginalNodes());
          targetDiv.style.display = originalDisplay;
        }
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
        const targetDiv = getLiveTarget();
        if (!targetDiv) return;

        targetDiv.replaceChildren(...cloneOriginalNodes());
        targetDiv.style.display = originalDisplay;
        state.isShowingSummary = false;
        updateUI();
        opts?.resize?.();
      }

      // Executed upon pressing the 'Show Summary' button. Replaces original text with the summary text.
      function showSummary() {
        if (!summaryNodes) return;
        const targetDiv = getLiveTarget();
        if (!targetDiv) return;

        targetDiv.replaceChildren(
          ...summaryNodes.map((node) => node.cloneNode(true)),
        );
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

          if (api.settings.showPreviousSummaries){
            showSummary();
          }
          updateUI();

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
      if (disposed || handledIframes.has(iframe)) return;
      handledIframes.add(iframe);

      const resolveTarget = () => {
        const doc = iframe.contentDocument;
        const inner = doc?.querySelector(".userHTML");
        return (inner?.querySelector("div") as HTMLElement | null) ?? null;
      };

      onIframeReady(iframe, () => {
        if (disposed) return;

        if (!resolveTarget()) {
          handledIframes.delete(iframe);
          return;
        }

        const host = iframe.parentElement;
        if (!host) {
          handledIframes.delete(iframe);
          return;
        }

        handleSummarisableContainer(resolveTarget, host, {
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

    function tryHandleDraftEditor(root: HTMLElement) {
      if (disposed) return;

      const resolveTarget = () =>
        (root.querySelector(
          ".public-DraftEditor-content > div",
        ) as HTMLElement | null);

      const text = resolveTarget();

      if (!text || handledEditors.has(text)) return;

      const buttonBarLocation = text.closest(
        "[class*='Module__wrapper']",
      ) as HTMLElement | null;

      if (!buttonBarLocation) return;

      handledEditors.add(text);

      handleSummarisableContainer(resolveTarget, buttonBarLocation);
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

    function initNoticesTracking() {
      if (disposed) return;

      const ensureNotice = (noticeEl: HTMLElement) => {
        if (disposed || watchedNotices.has(noticeEl)) return;
        watchedNotices.add(noticeEl);

        const connectIframes = () => {
          if (!noticeEl.isConnected) return;
          noticeEl.querySelectorAll("iframe.userHTML").forEach((iframe) => {
            if (iframe instanceof HTMLIFrameElement) handleIframe(iframe);
          });
        };

        connectIframes();

        const observer = new MutationObserver(() => {
          if (disposed || !noticeEl.isConnected) {
            observer.disconnect();
            return;
          }
          connectIframes();
        });

        observer.observe(noticeEl, { childList: true, subtree: true });
        disposables.push(() => observer.disconnect());
      };

      const ensureContainer = (container: HTMLElement) => {
        if (disposed || watchedNoticeContainers.has(container)) return;
        watchedNoticeContainers.add(container);

        container
          .querySelectorAll(".notice")
          .forEach((notice) => ensureNotice(notice as HTMLElement));

        const observer = new MutationObserver((mutations) => {
          if (disposed || !container.isConnected) {
            observer.disconnect();
            return;
          }

          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (!(node instanceof HTMLElement)) continue;

              if (node.classList.contains("notice")) {
                ensureNotice(node);
                continue;
              }

              node
                .querySelectorAll?.(".notice")
                .forEach((n) => ensureNotice(n as HTMLElement));
            }
          }
        });

        observer.observe(container, { childList: true, subtree: true });
        disposables.push(() => observer.disconnect());
      };

      const findExisting = () => {
        document
          .querySelectorAll(".notices")
          .forEach((el) => ensureContainer(el as HTMLElement));
      };

      const observeBodyForNotices = () => {
        const body = document.body;
        if (!body) return;

        const bodyObserver = new MutationObserver((mutations) => {
          if (disposed) {
            bodyObserver.disconnect();
            return;
          }

          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (!(node instanceof HTMLElement)) continue;

              if (node.classList.contains("notices")) {
                ensureContainer(node);
                continue;
              }

              node
                .querySelectorAll?.(".notices")
                .forEach((n) => ensureContainer(n as HTMLElement));
            }
          }
        });

        bodyObserver.observe(body, { childList: true, subtree: true });
        disposables.push(() => bodyObserver.disconnect());
      };

      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          () => {
            if (disposed) return;
            observeBodyForNotices();
            findExisting();
          },
          { once: true },
        );
      } else {
        observeBodyForNotices();
        findExisting();
      }
    }

    // Kick off the notices tracking subsystem as soon as the plugin run function executes.
    initNoticesTracking();

    return () => {
      dispose();
    };
  },
};

export default AIPlugin;

