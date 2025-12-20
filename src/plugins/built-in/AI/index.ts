import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";
import { defineSettings, selectSetting, Setting, stringSetting } from "@/plugins/core/settingsHelpers";
import {
  type ApiStandard,
  ask,
  autosizeIframe,
  buildSummaryContainer,
  cloneChildNodes,
  createSummaryBar,
  extractAttachmentLinks,
  onIframeReady
} from "@/plugins/built-in/AI/utils";

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
    default: "Respond ONLY with a CONCISE bullet summary. NO FORMATTING.",
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

const AIPlugin: Plugin<typeof settings> = {
  id: "ai",
  name: "AI",
  description: "Adds AI Functionality throughout SEQTA",
  version: "1.0.0",
  settings: settingsInstance.settings,
  disableToggle: true,
  beta: true,

  run: async (api) => {

    // Finds summarisable text, summarises it, formats the summary into bullets, and replaces the original text.
    const { unregister: pageUnregister } = api.seqta.onMount(".userHTML", async (el) => {
      if (!(el instanceof HTMLIFrameElement)) return;
      const iframeEl = el;

      // Wait for iframe to fully load
      const initialiseSummaryUI = async () => {
        const doc = iframeEl.contentDocument;
        if (!doc) return;

        // ...iframe(class=userHTML) . #document . body(class=userHTML)
        const innerEl = doc.querySelector(".userHTML");
        if (!innerEl) return;

        // ...iframe(class=userHTML) . #document . body(class=userHTML) . div
        const targetDiv = innerEl.querySelector("div") as HTMLDivElement;
        if (!targetDiv) return;

        // Normalize whitespace and get text.
        const text = targetDiv.textContent?.trim();
        if (!text) return;

        // Save original nodes, so that they can be swapped upon toggleBtn press.
        const originalNodes = cloneChildNodes(targetDiv);

        // Helps solve an edge case in which an attachment is WITHIN a course outline. Very rare.
        const attachmentLinks = extractAttachmentLinks(targetDiv);

        // Save summary nodes, so that they can be swapped upon toggleBtn press.
        let summaryNodes: ChildNode[] | null = null;

        // Possible states.
        const state = {
          hasSummary: false,
          isShowingSummary: false,
          isLoading: false,
        };

        // Bar with same parent as iframe. Contains buttons for controlling the plugin.
        const buttonBar = createSummaryBar();

        // Button that only shows when a summary does NOT exist. Creates a summary.
        const summariseBtn = document.createElement("button");
        summariseBtn.textContent = "Summarise";

        // Toggles between viewing the summarised text and original text. Only shows if a summary already exists.
        const toggleBtn = document.createElement("button");
        toggleBtn.textContent = "Show original";
        toggleBtn.style.display = "none";

        // Scrap the current summary, and generate a new one. Only shows if a summary already exists.
        const resummariseBtn = document.createElement("button");
        resummariseBtn.textContent = "Re-summarise";
        resummariseBtn.style.display = "flex";

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

          if (state.isLoading) {
            resummariseBtn.textContent = "Summarising…";
          } else {
            resummariseBtn.textContent = "Re-summarise";
          }
        }

        // Executed upon pressing the 'Show Original' button. Replaces summary text with the original text.
        function showOriginal() {
          targetDiv.replaceChildren(
            ...originalNodes.map((n) => n.cloneNode(true)),
          );
          state.isShowingSummary = false;
          updateUI();
          autosizeIframe(iframeEl);
        }

        // Executed upon pressing the 'Show Summary' button. Replaces original text with the summary text.
        function showSummary() {
          if (!summaryNodes) return;
          targetDiv.replaceChildren(
            ...summaryNodes.map((n) => n.cloneNode(true)),
          );
          state.isShowingSummary = true;
          updateUI();
          autosizeIframe(iframeEl);
        }

        // Generates a summary, saves it's nodes, and shows it.
        async function generateSummary() {
          if (state.isLoading) return;
          state.isLoading = true;
          updateUI();

          const summary = await ask({
            standard: api.settings.apiStandard,
            rawEndpoint: api.settings.apiEndpoint,
            apiKey: api.settings.apiKey,
            model: api.settings.model,
            systemPrompt: api.settings.systemPrompt,
            prompt: text,
          });

          if (!summary) {
            state.isLoading = false;
            updateUI();
            return;
          }

          summaryNodes = [buildSummaryContainer(summary)];

          // Helps solve an edge case in which an attachment is WITHIN a course outline. Very rare.
          if (attachmentLinks.length) {
            const attachmentsContainer = document.createElement("div");
            attachmentsContainer.style.marginTop = "8px";

            attachmentLinks.forEach((link) => {
              attachmentsContainer.appendChild(link.cloneNode(true));
              attachmentsContainer.appendChild(document.createElement("br"));
            });

            summaryNodes.push(attachmentsContainer);
          }

          state.hasSummary = true;
          state.isLoading = false;
          showSummary();
        }

        // Upon click, generate summary.
        summariseBtn.onclick = generateSummary;
        resummariseBtn.onclick = generateSummary;

        // Upon click, toggle between showing the summary and showing the original text.
        toggleBtn.onclick = () => {
          state.isShowingSummary ? showOriginal() : showSummary();
        };

        // Appends buttons to the button bar
        buttonBar.append(summariseBtn, toggleBtn, resummariseBtn);

        // Prepends button bar to the iframe's parent.
        const host = iframeEl.parentElement;
        if (host && !host.querySelector(".ai-summary-bar")) {
          host.prepend(buttonBar);
        }

        updateUI();
      };

      onIframeReady(iframeEl, initialiseSummaryUI);
    });

    return () => {
      pageUnregister();
    };
  },
};

export default AIPlugin;
