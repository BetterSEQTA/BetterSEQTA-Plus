import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";
import { defineSettings, selectSetting, Setting, stringSetting } from "@/plugins/core/settingsHelpers";

type ApiStandard = "openai" | "ollama" | "gemini";


// Helper Functions

// Ensures leniency in what the user can input (so they don't have to type the endpoint in a very specific manner)
function validateEndpoint(raw: string): URL | null {
  if (!raw) return null;

  let value = raw.trim();
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value)) {
    value = `http://${value}`;
  }

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.pathname = url.pathname.replace(/\/+$/, "") + "/";
    return url;
  } catch {
    return null;
  }
}

// Builds the request url based on standard selected and endpoint inputted.
function buildRequestUrl(
  standard: ApiStandard,
  endpoint: URL,
  model: string,
): URL {
  switch (standard) {
    case "openai":
      return new URL("v1/chat/completions", endpoint);
    case "gemini":
      return new URL(`models/${model}:generateContent`, endpoint);
    case "ollama":
      return new URL("generate", endpoint);
  }
}

// Builds the headers based on standard selected (Google, why do you have to try to be different?)
function buildHeaders(standard: ApiStandard, apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(standard === "gemini"
      ? { "X-Goog-Api-Key": apiKey }
      : { Authorization: `Bearer ${apiKey}` }),
  };
}

// Builds the payload based on various factors. (Google, just why? What kinda structure is that...)
function buildPayload(
  standard: ApiStandard,
  model: string,
  systemPrompt: string,
  prompt: string,
) {
  switch (standard) {
    case "openai":
      return {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      };

    case "gemini":
      return {
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      };

    case "ollama":
      return {
        model,
        system: systemPrompt,
        prompt,
        stream: false,
      };
  }
}

// Extracts the response text via the method corresponding to the selected standard.
function extractResponseText(standard: ApiStandard, data: any): string | null {
  try {
    switch (standard) {
      case "openai":
        return data?.choices?.[0]?.message?.content ?? null;

      case "gemini":
        return (
          data?.candidates?.[0]?.content?.parts
            ?.map((p: any) => p.text)
            .join("") ?? null
        );

      case "ollama":
        return data?.response ?? null;
    }
  } catch {
    return null;
  }
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
    default: "Your response should consist ONLY of summarising CONCISE bullets. NO FORMATTING.",
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

    // Carries out the process of prompting the model, utilising all the helpers.
    async function ask(prompt: string, systemPrompt: string): Promise<string | null> {
      const standard = api.settings.apiStandard;
      const endpoint = validateEndpoint(api.settings.apiEndpoint);
      const apiKey = api.settings.apiKey;
      const model = api.settings.model;

      // checks if all required variables exist.
      if (!endpoint || !apiKey || !model) {
        console.warn("[AI Plugin] Missing or invalid configuration");
        return null;
      }

      const url = buildRequestUrl(standard, endpoint, model);

      // Sends API request, and sets res to the response data.
      const res = await fetch(url, {
        method: "POST",
        headers: buildHeaders(standard, apiKey),
        body: JSON.stringify(
          buildPayload(standard, model, systemPrompt, prompt),
        ),
      });

      // if response code is NOT ok, report that the request failed.
      if (!res.ok) {
        throw new Error(
          `[AI Plugin] Request failed (${res.status}): ${await res.text()}`,
        );
      }

      const data = await res.json();
      const text = extractResponseText(standard, data);

      if (!text) {
        throw new Error("[AI Plugin] Empty or unparseable response");
      }

      // return summary
      return text.trim();
    }

    // Finds summarisable text, summarises it, formats the summary into bullets, and replaces the original text.
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

        // Normalize whitespace and get text.
        const text = targetDiv.textContent?.trim() || null;
        if (!text) return;

        // Generate summary
        const summary = await ask(
          text,
          api.settings.systemPrompt,
        );
        if (!summary) return;

        // split summary by newlines, add bullets.
        const formatted = summary
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => line.replace(/^[-*]+\s*/, ""))
          .map((line) => `• ${line}`)
          .join("\n");

        // insert formatted summary into the target div, in place of the previous text.
        targetDiv.replaceChildren(
          ...formatted
            .split("\n")
            .flatMap((line, i) =>
              i === 0
                ? [document.createTextNode(line)]
                : [document.createElement("br"), document.createTextNode(line)],
            ),
        );
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
