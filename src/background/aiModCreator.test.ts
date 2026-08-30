import browser from "webextension-polyfill";
import {
  AI_MOD_CREATOR_MESSAGE_TYPE,
  createAiModCreatorService,
  formatOpenRouterError,
  handleAiModCreatorMessage,
} from "./aiModCreator";
import type { SelectedElementContext } from "@/plugins/built-in/aiModCreator/types";

const context: SelectedElementContext = {
  route: "assessments",
  rootSelector: "#selected",
  request: "Round this card",
  userContext: "Assessment summary",
  selectedHtml: '<section id="selected">Assessment</section>',
  domCatalog: [
    {
      selector: ":scope",
      tag: "section",
      classes: [],
      parentSelector: null,
      siblingIndex: 0,
      siblingCount: 1,
      layout: { display: "block" },
    },
  ],
  tagName: "section",
  dimensions: { width: 400, height: 200 },
  computedStyle: { color: "rgb(0, 0, 0)" },
};

describe("AI mod OpenRouter background service", () => {
  it("stores the key locally and reports only whether it exists", async () => {
    const service = createAiModCreatorService({
      fetchImpl: jest.fn(),
      now: () => 1_000,
    });

    await service.saveKey("  sk-or-v1-test-key-123456  ");
    await expect(service.getKeyStatus()).resolves.toEqual({ configured: true });
    expect(await browser.storage.local.get("aiModCreator.openRouterApiKey")).toEqual({
      "aiModCreator.openRouterApiKey": "sk-or-v1-test-key-123456",
    });

    await service.clearKey();
    await expect(service.getKeyStatus()).resolves.toEqual({ configured: false });
  });

  it("calls the free model with json_object output and provider fallbacks", async () => {
    await browser.storage.local.set({
      "aiModCreator.openRouterApiKey": "sk-or-v1-test-key-123456",
    });
    const fetchImpl = jest.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        model: "minimax/minimax-m2.7:free",
        provider: { allow_fallbacks: true },
        response_format: { type: "json_object" },
      });
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer sk-or-v1-test-key-123456",
      });
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  name: "Rounded card",
                  description: "Rounds the selected card.",
                  operations: [
                    {
                      type: "setStyle",
                      selector: ":scope",
                      property: "border-radius",
                      value: "12px",
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    });
    const service = createAiModCreatorService({
      fetchImpl,
      now: () => 10_000,
    });

    await expect(service.generate(context)).resolves.toMatchObject({
      name: "Rounded card",
      operations: [{ type: "setStyle", property: "border-radius" }],
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("retries without structured output when OpenRouter routing fails", async () => {
    await browser.storage.local.set({
      "aiModCreator.openRouterApiKey": "sk-or-v1-test-key-123456",
    });
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message:
                "No endpoints found that can handle the requested parameters.",
            },
          }),
          { status: 404 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    name: "Fallback mod",
                    description: "Generated without structured output.",
                    operations: [{ type: "hide", selector: ":scope .meta" }],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );
    const service = createAiModCreatorService({
      fetchImpl,
      now: () => 10_000,
    });

    await expect(service.generate(context)).resolves.toMatchObject({
      name: "Fallback mod",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    const secondBody = JSON.parse(String(fetchImpl.mock.calls[1][1]?.body));
    expect(firstBody.response_format).toEqual({ type: "json_object" });
    expect(secondBody.response_format).toBeUndefined();
  });

  it("streams partial recipe content and token usage", async () => {
    await browser.storage.local.set({
      "aiModCreator.openRouterApiKey": "sk-or-v1-test-key-123456",
    });
    const json = JSON.stringify({
      name: "Streamed mod",
      description: "Generated incrementally",
      operations: [{ type: "hide", selector: ":scope .metadata" }],
    });
    const first = json.slice(0, 35);
    const second = json.slice(35);
    const streamBody = [
      `data: ${JSON.stringify({ choices: [{ delta: { reasoning_details: [{}] } }] })}\n\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: first } }] })}\n\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: second } }], usage: { prompt_tokens: 20, completion_tokens: 30 } })}\n\n`,
      "data: [DONE]\n\n",
    ].join("");
    const service = createAiModCreatorService({
      fetchImpl: jest.fn(async () =>
        new Response(streamBody, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      ),
      now: () => 20_000,
    });
    const progress: unknown[] = [];

    await expect(
      service.streamGenerate(context, (update) => progress.push(update)),
    ).resolves.toMatchObject({ name: "Streamed mod" });
    expect(progress).toEqual(
      expect.arrayContaining([
        { type: "status", text: "Connecting to MiniMax M2.7 (free)…" },
        { type: "status", text: "Model is reasoning…" },
        { type: "content", text: first },
        {
          type: "usage",
          promptTokens: 20,
          completionTokens: 30,
        },
      ]),
    );
  });

  it("surfaces stream rate-limit errors with actionable guidance", async () => {
    await browser.storage.local.set({
      "aiModCreator.openRouterApiKey": "sk-or-v1-test-key-123456",
    });
    const streamBody = [
      ": OPENROUTER PROCESSING\n\n",
      `data: ${JSON.stringify({
        error: {
          code: 429,
          message: "Provider returned error",
          metadata: { error_type: "rate_limit_exceeded" },
        },
      })}\n\n`,
    ].join("");
    const service = createAiModCreatorService({
      fetchImpl: jest.fn(async () =>
        new Response(streamBody, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      ),
      now: () => 20_000,
    });

    await expect(service.streamGenerate(context, () => {})).rejects.toThrow(
      /Rate limit reached for MiniMax M2\.7 \(free\)/,
    );
  });

  it("formats free-tier rate-limit guidance", () => {
    expect(
      formatOpenRouterError(
        {
          code: 429,
          message: "Provider returned error",
          metadata: { error_type: "rate_limit_exceeded" },
        },
        "minimax/minimax-m2.7:free",
      ),
    ).toMatch(/switch model/i);
  });

  it("rejects missing keys, oversized input, throttling, and provider errors", async () => {
    const service = createAiModCreatorService({
      fetchImpl: jest.fn(),
      now: () => 1_000,
    });
    await expect(service.generate(context)).rejects.toThrow("API key");

    await service.saveKey("sk-or-v1-test-key-123456");
    await expect(
      service.generate({ ...context, request: "x".repeat(2_001) }),
    ).rejects.toThrow("too long");

    const failingService = createAiModCreatorService({
      fetchImpl: jest.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              message: "Free model rate limit reached",
              code: 429,
              metadata: { error_type: "rate_limit_exceeded" },
            },
          }),
          { status: 429 },
        ),
      ),
      now: () => 10_000,
    });
    await expect(failingService.generate(context)).rejects.toThrow(
      /Rate limit reached for MiniMax M2\.7 \(free\)/,
    );
    await expect(failingService.generate(context)).rejects.toThrow(
      /Please wait \d+s/,
    );
  });

  it("rejects untrusted runtime message senders", () => {
    const sendResponse = jest.fn();
    const handled = handleAiModCreatorMessage(
      {
        type: AI_MOD_CREATOR_MESSAGE_TYPE,
        action: "status",
      },
      { id: "another-extension" } as browser.Runtime.MessageSender,
      sendResponse,
      () => false,
    );

    expect(handled).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: "Unauthorized sender",
    });
  });
});
