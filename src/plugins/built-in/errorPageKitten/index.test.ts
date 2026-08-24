/**
 * @jest-environment jsdom
 */
/// <reference types="jest" />
import type { PluginAPI } from "@/plugins/core/types";

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

import { mountErrorPageKitten } from "./index";

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

    const card = getCard();
    expect(card).not.toBeNull();
    expect(document.documentElement.classList).toContain("bsplus-kitten-404");
    expect(card?.querySelector("h1")?.textContent).toBe("404 Not Found");
    expect(document.title).toBe("404 Not Found");
    expect(card?.querySelector(".kitten img")?.getAttribute("src")).toContain("kitten");
    expect(
      document.querySelector(".message")?.classList.contains("bsplus-kitten-404-hidden"),
    ).toBe(true);

    cleanup();
    expect(getCard()).toBeNull();
    expect(document.title).toBe("Page not found");
  });
});
