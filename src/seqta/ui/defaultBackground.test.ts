/**
 * @jest-environment jsdom
 */
import browser from "@/lib/browser";
import { writeData } from "@/interface/hooks/backgroundDataLoader";
import { applyDefaultBackgroundOnce } from "./defaultBackground";
import { DEFAULT_BACKGROUND_PENDING_KEY } from "./defaultBackgroundKey";

jest.mock("@/resources/backgrounds/default-background.webp", () => "default-background.webp", {
  virtual: true,
});
jest.mock("@/lib/extensionAssetUrl", () => ({ resolveExtensionAssetUrl: (url: string) => url }));
jest.mock("@/interface/hooks/backgroundDataLoader", () => ({ writeData: jest.fn() }));

const blob = { size: 1 };

beforeEach(() => {
  localStorage.clear();
  (writeData as jest.Mock).mockClear();
  globalThis.fetch = jest.fn(async () => ({ blob: async () => blob })) as unknown as typeof fetch;
});

it("does nothing without the fresh-install flag", async () => {
  await applyDefaultBackgroundOnce();

  expect(writeData).not.toHaveBeenCalled();
  expect(localStorage.getItem("selectedBackground")).toBeNull();
});

it("installs and selects the bundled background on a fresh install", async () => {
  await browser.storage.local.set({ [DEFAULT_BACKGROUND_PENDING_KEY]: true });

  await applyDefaultBackgroundOnce();

  expect(writeData).toHaveBeenCalledWith("image-116", "image", blob);
  expect(localStorage.getItem("selectedBackground")).toBe("image-116");
  expect(await browser.storage.local.get(DEFAULT_BACKGROUND_PENDING_KEY)).toEqual({});
});

it("keeps a background the user already chose", async () => {
  await browser.storage.local.set({ [DEFAULT_BACKGROUND_PENDING_KEY]: true });
  localStorage.setItem("selectedBackground", "");

  await applyDefaultBackgroundOnce();

  expect(writeData).not.toHaveBeenCalled();
  expect(localStorage.getItem("selectedBackground")).toBe("");
  expect(await browser.storage.local.get(DEFAULT_BACKGROUND_PENDING_KEY)).toEqual({});
});
