/**
 * @jest-environment jsdom
 */
/// <reference types="jest" />
jest.mock("@/lib/extensionAssetUrl", () => ({
  resolveExtensionAssetUrl: (url: string) =>
    `chrome-extension://test/${String(url).replace(/^\/+/, "")}`,
}));
jest.mock("@/resources/error-page/kitten.png", () => ({
  __esModule: true,
  default: "/resources/error-page/kitten.png",
}));
jest.mock("./styles.css?inline", () => ({
  __esModule: true,
  default: "/* test */",
}));

import errorPageKittenPlugin, {
  isSeqta404Page,
  mountErrorPageKitten,
} from "./index";

const REBRANDED_404_BODY = `
  <div class="message">
    <h1>Page not found</h1>
    <p>We can't find the page you're looking for.</p>
  </div>
`;

function getCard(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>(".bsplus-kitten-404");
}

describe("errorPageKitten", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.title = "";
    document.documentElement.classList.remove("bsplus-kitten-404");
  });

  it("mounts the classic kitten 404 card", () => {
    document.title = "Page not found";
    document.body.innerHTML = REBRANDED_404_BODY;

    const cleanup = mountErrorPageKitten();

    expect(getCard()).not.toBeNull();
    expect(document.documentElement.classList).toContain("bsplus-kitten-404");

    cleanup();
    expect(getCard()).toBeNull();
  });

  it("detects standalone 404 pages by .message and title", () => {
    document.title = "Page not found";
    document.body.innerHTML = REBRANDED_404_BODY;
    expect(isSeqta404Page()).toBe(true);
  });

  it("does not detect the SPA", () => {
    document.title = "SEQTA Learn";
    document.body.innerHTML = '<div id="container"></div>';
    expect(isSeqta404Page()).toBe(false);
  });

  it("plugin run is a no-op outside a 404 page", async () => {
    document.title = "SEQTA Learn";
    document.body.innerHTML = '<div id="container"></div>';

    const cleanup = await errorPageKittenPlugin.run();

    expect(getCard()).toBeNull();
    expect(cleanup).toBeDefined();
    cleanup?.();
  });
});
