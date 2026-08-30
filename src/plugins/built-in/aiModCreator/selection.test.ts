/** @jest-environment jsdom */

import {
  createStableSelector,
  startElementSelection,
} from "./selection";

describe("AI mod element selection", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main>
        <section class="cards">
          <article class="assessment card"><h2>First</h2></article>
          <article class="assessment card" data-testid="target"><h2>Second</h2></article>
        </section>
      </main>
    `;
  });

  it("prefers a unique id or test attribute", () => {
    const target = document.querySelector<HTMLElement>("[data-testid=target]")!;
    expect(createStableSelector(target)).toBe('[data-testid="target"]');

    target.id = "assessment:42";
    expect(createStableSelector(target)).toBe("#assessment\\:42");
  });

  it("falls back to a unique structural selector", () => {
    const target = document.querySelectorAll<HTMLElement>("article")[1];
    target.removeAttribute("data-testid");

    const selector = createStableSelector(target);
    expect(document.querySelector(selector)).toBe(target);
    expect(document.querySelectorAll(selector)).toHaveLength(1);
  });

  it("captures a clicked page element without activating it", () => {
    const onSelect = jest.fn();
    const onCancel = jest.fn();
    const target = document.querySelector<HTMLElement>("[data-testid=target]")!;
    const clickSpy = jest.fn();
    target.addEventListener("click", clickSpy);

    const stop = startElementSelection({ onSelect, onCancel });
    target.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    expect(onSelect).toHaveBeenCalledWith(target);
    expect(clickSpy).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(document.querySelector("[data-bsplus-ai-selection-overlay]")).toBeNull();
    stop();
  });

  it("cancels with Escape and removes the overlay", () => {
    const onCancel = jest.fn();
    const stop = startElementSelection({
      onSelect: jest.fn(),
      onCancel,
    });

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-bsplus-ai-selection-overlay]")).toBeNull();
    stop();
  });
});
