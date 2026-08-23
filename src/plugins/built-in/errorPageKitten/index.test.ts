/**
 * @jest-environment jsdom
 */
/// <reference types="jest" />
import type { PluginAPI } from "@/plugins/core/types";
import errorPageKittenPlugin from "./index";

const REBRANDED_404_BODY = `
  <div class="message">
    <h1>Page not found</h1>
    <p>We can't find the page you're looking for.</p>
    <p>It may have been moved, deleted or the link might be out of date.</p>
    <p class="error-ref">Ref: 404</p>
  </div>
`;

const api = {
  settings: { loaded: Promise.resolve() },
} as unknown as PluginAPI<{}>;

async function startPlugin(): Promise<() => void> {
  const cleanup = (await errorPageKittenPlugin.run(api)) ?? (() => {});
  return cleanup;
}

function getCard(): HTMLElement | null {
  // The card container shares its class with <html>, so scope to body.
  return document.body.querySelector<HTMLElement>(".bsplus-kitten-404");
}

function expectKittenRendered(): void {
  const card = getCard();
  expect(card).not.toBeNull();
  expect(document.documentElement.classList).toContain("bsplus-kitten-404");
  expect(card?.querySelector("h1")?.textContent).toBe("404 Not Found");
  // The original document's title.
  expect(document.title).toBe("404 Not Found");
  // The reference page's exact vendor-prefixed banner CSS is shipped at runtime.
  const stripeStyle = Array.from(
    document.head.querySelectorAll("style"),
  ).find((s) => s.textContent?.includes("-webkit-repeating-linear-gradient"));
  expect(stripeStyle?.textContent).toContain(
    "repeating-linear-gradient(45deg",
  );
  const img = card?.querySelector(".kitten img") as HTMLImageElement | null;
  expect(img?.getAttribute("alt")).toBeNull();
  expect(img?.src).toContain("kitten");
  const flickrLink = card?.querySelector(
    ".attrib a",
  ) as HTMLAnchorElement | null;
  expect(flickrLink?.textContent).toBe("by storyvillegirl");
  expect(flickrLink?.href).toBe(
    "http://www.flickr.com/photos/bibbit/2756165489/",
  );
  const seqtaLink = card?.querySelector("a[href='http://www.seqta.com.au']");
  expect(seqtaLink?.textContent).toBe("SEQTA");
  // Original rebranded message is hidden.
  expect(
    document.querySelector(".message")?.classList.contains(
      "bsplus-kitten-404-hidden",
    ),
  ).toBe(true);
}

describe("errorPageKitten", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.title = "";
    document.documentElement.classList.remove("bsplus-kitten-404");
  });

  it("renders the classic kitten 404 card over the rebranded page", async () => {
    document.title = "Page not found";
    document.body.innerHTML = REBRANDED_404_BODY;

    const cleanup = await startPlugin();

    expectKittenRendered();

    cleanup();
    expect(getCard()).toBeNull();
    expect(document.title).toBe("Page not found");
    expect(
      Array.from(document.head.querySelectorAll("style")).some((s) =>
        s.textContent?.includes("-webkit-repeating-linear-gradient"),
      ),
    ).toBe(false);
    expect(
      document.documentElement.classList.contains("bsplus-kitten-404"),
    ).toBe(false);
    expect(
      document
        .querySelector(".message")
        ?.classList.contains("bsplus-kitten-404-hidden"),
    ).toBe(false);
  });

  it("does not render inside the SPA (no .message, has #container)", async () => {
    document.title = "SEQTA";
    document.body.innerHTML = '<div id="container"></div>';

    await startPlugin();

    expect(getCard()).toBeNull();
  });

  it("does not render on an unrelated page", async () => {
    document.title = "Home";
    document.body.innerHTML = '<div id="app"></div>';

    await startPlugin();

    expect(getCard()).toBeNull();
  });
});
