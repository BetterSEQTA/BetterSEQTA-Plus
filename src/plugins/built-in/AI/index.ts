import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";
import { defineSettings, selectSetting, Setting, stringSetting } from "@/plugins/core/settingsHelpers";

// Step 1: Define settings with proper typing
const settings = defineSettings({
  apiStandard: selectSetting({
    default: "/v1/chat/completions",
    title: "API Standard",
    description: "API standard to be used",
    options: [
      { value: "/v1/chat/completions", label: "OpenAI" },
      { value: "/generate", label: "Ollama" },
      { value: "/v1beta/models/", label: "Gemini"}
    ],
  }),
  apiEndpoint: stringSetting({
    default: "",
    title: "API Endpoint",
    description: "Must use the OpenAI or Ollama standard",
  }),
  apiKey: stringSetting({
    default: "",
    title: "API Key",
    description: "Required for authentication",
  }),
  model: stringSetting({
    default: "",
    title: "Model",
    description: "LLM Model to be used",
  }),
});

class AIPluginClass extends BasePlugin<typeof settings> {
  @Setting(settings.apiStandard)
  apiStandard!: string;

  @Setting(settings.apiEndpoint)
  apiEndpoint!: string;

  @Setting(settings.apiKey)
  apiKey!: string;

  @Setting(settings.model)
  model!: string;
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
    async function ask(prompt: string, systemPrompt: string): Promise<string | null> {
      const standard = api.settings.apiStandard;
      const endpoint = api.settings.apiEndpoint;
      const key = api.settings.apiKey;
      const model = api.settings.model;

      if (!endpoint || !key || !model) {
        console.warn("[AI Plugin] Missing endpoint or API key");
        return null;
      }

      const isOpenAI = standard === "/v1/chat/completions";
      const isGemini = standard === "/v1beta/models/";

      try {
        const res = await fetch(isGemini ? `${endpoint}${standard}${model}:generateContent` : `${endpoint}${standard}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(isGemini
              ? { "X-Goog-Api-Key": key }
              : { Authorization: `Bearer ${key}` }),
          },
          body: JSON.stringify(

            // OpenAI standard structure
            isOpenAI ? {
              model: model,
              messages: [{ role: "system", content: systemPrompt },
                         { role: "user", content: prompt }],
            }

            // Gemini standard structure
            : isGemini ? {
              system_instruction: {
                parts: [
                  {
                    text: systemPrompt,
                  }
                ]
              },
              contents: [
                {
                  parts: [
                    {
                      text: prompt,
                    }
                  ]
                }
              ],
            }

            // Ollama standard structure
            : {
              model: model,
              system: systemPrompt,
              prompt: prompt,
              stream: false,
            }),
        });

        if (!res.ok) {
          console.error("[AI Plugin] Request failed:", await res.text());
          return null;
        }

        const data = await res.json();

        return isOpenAI
          ? data?.choices?.[0]?.message?.content ?? null
          : isGemini ? data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null
          : data?.response ?? null;

      } catch (err) {
        console.error("[AI Plugin] Fetch error:", err);
        return null;
      }
    }

    const { unregister: pageUnregister } = api.seqta.onMount('.userHTML', async (iframeEl) => {
      if (!(iframeEl instanceof HTMLIFrameElement)) return;

      // Wait for iframe to fully load
      const handleLoad = async () => {
        const doc = iframeEl.contentDocument;
        if (!doc) return;

        const innerEl = doc.querySelector(".userHTML");
        if (!innerEl) return;

        const targetDiv = innerEl.querySelector("div");
        if (!targetDiv) return;

        // Normalize whitespace and get text
        const text = targetDiv.textContent?.trim() || null;
        if (!text) return;

        const summary = await ask(
          text,
          "Your response should consist ONLY of summarising RAW CONCISE BULLETS. NO BULLET SYMBOL.",
        );
        if (!summary) return;
        console.log(summary);

        // Format: split by newlines or sentences and add bullets
        const formatted = summary
          .split(/\r?\n/)                   // split strictly by newline
          .map((line) => line.trim())        // trim whitespace
          .filter((line) => line.length > 0)
          .map((line) => line.replace(/^[-*]+\s*/, "")) // remove leading - or *
          .map((line) => `• ${line}`)       // add your own bullet
          .join("\n");



        targetDiv.innerHTML = formatted.replace(/\n/g, "<br>");
      };

      if (iframeEl.contentDocument?.readyState === 'complete') {
        handleLoad();
      } else {
        iframeEl.addEventListener('load', handleLoad, { once: true });
      }
    });

    return () => {
      pageUnregister();
    };
  },
};

export default AIPlugin;
