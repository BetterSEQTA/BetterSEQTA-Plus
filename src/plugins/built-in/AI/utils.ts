export type ApiStandard = "openai" | "ollama" | "gemini";

// Ensures leniency in what the user can input (so they don't have to type the endpoint in a very specific manner)
export function validateEndpoint(raw: string): URL | null {
  if (!raw) return null;

  let value = raw.trim();

  // Checks if there's a protocol, if not it adds https:// as a default.
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value)) {
    value = `https://${value}`;
  }

  try {
    const url = new URL(value);

    // If protocol isn't one of the whitelisted, reject it.
    if (!["http:", "https:"].includes(url.protocol)) return null;

    // Ensures there is always exactly ONE trailing slash, so that URLs can be crafted correctly.
    url.pathname = url.pathname.replace(/\/+$/, "") + "/";
    return url;
  } catch {
    return null;
  }
}


// Builds the request url based on standard selected and endpoint inputted.
export function buildRequestUrl(
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
export function buildHeaders(
  standard: ApiStandard,
  apiKey: string,
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(standard === "gemini"
      ? { "X-Goog-Api-Key": apiKey }
      : { Authorization: `Bearer ${apiKey}` }),
  };
}


// Builds the payload based on various factors. (Google, just why? What kinda structure is that...)
export function buildPayload(
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
export function extractResponseText(
  standard: ApiStandard,
  data: any,
): string | null {
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


// Carries out the process of prompting the model.
export async function ask({
  standard,
  rawEndpoint,
  apiKey,
  model,
  systemPrompt,
  prompt,
}: {
  standard: ApiStandard;
  rawEndpoint: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  prompt: string;
}): Promise<string | null> {
  const endpoint = validateEndpoint(rawEndpoint);

  // Ensures all required variables exist before proceeding.
  if (!endpoint || !apiKey || !model) {
    console.warn("[AI Plugin] Missing or invalid configuration");
    return null;
  }

  // Sends a response that is dynamically crafted based on what options are selected.
  const res = await fetch(buildRequestUrl(standard, endpoint, model), {
    method: "POST",
    headers: buildHeaders(standard, apiKey),
    body: JSON.stringify(buildPayload(standard, model, systemPrompt, prompt)),
  });

  // if response code is NOT OK, report that the request failed.
  if (!res.ok) {
    throw new Error(`[AI Plugin] Request failed (${res.status})`);
  }

  // Take the raw JSON, and extract only the AI's response.
  const data = await res.json();
  const text = extractResponseText(standard, data);

  if (!text) {
    throw new Error("[AI Plugin] Empty or unparseable response");
  }

  // Return summary.
  return text.trim();
}


// Autosize the iframe. Reimplementation of 'autosize', of which is an instance method on SEQTA's seqta.ui.Frame class. Defined in lib.js.
export function autosizeIframe(iframe: HTMLIFrameElement) {
  const doc = iframe.contentDocument;
  if (!doc || !doc.body) return;

  let delay = 100;

  const resize = () => {
    if (!iframe.offsetParent) return;

    const body = doc.body;
    const height = Math.max(body.scrollHeight, body.offsetHeight);

    iframe.style.visibility = "visible";
    iframe.style.minHeight = "0px";
    iframe.style.height = `${height}px`;

    delay *= 10;
    if (delay <= 10_000) {
      setTimeout(resize, delay);
    }
  };

  setTimeout(resize, delay);
}


// Builds the summary container, containing the formatted text and styling.
export function buildSummaryContainer(summary: string): HTMLDivElement {
  // Formats the summary. Replaces common AI 'bullets' with a real bullet point.
  const lines = summary
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `• ${l.replace(/^[-*]+\s*/, "")}`);

  // Styling
  const container = document.createElement("div");
  container.className = "ai-summary-content";
  container.style.fontSize = "14px";
  container.style.lineHeight = "2.0";
  container.style.whiteSpace = "pre-line";

  // Adds text to container
  lines.forEach((line, i) => {
    const span = document.createElement("span");
    span.textContent = line;
    container.appendChild(span);
    if (i < lines.length - 1) {
      container.appendChild(document.createElement("br"));
    }
  });

  return container;
}


// Rarely, there can be an attachment link WITHIN a course outline. This helps solve that edge case.
export function extractAttachmentLinks(el: Element): HTMLAnchorElement[] {
  return Array.from(el.querySelectorAll("a"))
    .filter((a) => a.href && a.textContent?.trim())
    .map((a) => a.cloneNode(true) as HTMLAnchorElement);
}


//-----// MINOR FUNCTIONS. Just makes index look nice and clean. //-----//

export function cloneChildNodes(el: Element): Node[] {
  return Array.from(el.childNodes).map(
    (n) => n.cloneNode(true) as Node
  );
}

export function onIframeReady(
  iframe: HTMLIFrameElement,
  cb: () => void,
) {
  if (iframe.contentDocument?.readyState === "complete") {
    cb();
  } else {
    iframe.addEventListener("load", cb, { once: true });
  }
}

export function createSummaryBar(): HTMLDivElement {
  const bar = document.createElement("div");
  bar.className = "ai-summary-bar";
  bar.style.display = "flex";
  bar.style.gap = "8px";
  bar.style.marginBottom = "8px";
  return bar;
}
