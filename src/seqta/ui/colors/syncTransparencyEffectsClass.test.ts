/** @jest-environment jsdom */

import { syncTransparencyEffectsClass } from "./syncTransparencyEffectsClass";

describe("syncTransparencyEffectsClass", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("transparencyEffects");
  });

  it("adds the transparency class when enabled", () => {
    syncTransparencyEffectsClass(true);
    expect(document.documentElement.classList.contains("transparencyEffects")).toBe(true);
  });

  it("removes the transparency class when disabled", () => {
    document.documentElement.classList.add("transparencyEffects");
    syncTransparencyEffectsClass(false);
    expect(document.documentElement.classList.contains("transparencyEffects")).toBe(false);
  });
});
