/** @jest-environment jsdom */

import { applyModRecipe, ModRuntime } from "./modRuntime";
import type { StoredModRecipe } from "./types";

function recipe(
  operations: StoredModRecipe["operations"],
  overrides: Partial<StoredModRecipe> = {},
): StoredModRecipe {
  return {
    schemaVersion: 1,
    id: "mod-1",
    name: "Test mod",
    description: "Test",
    enabled: true,
    route: "assessments",
    rootSelector: "#selected",
    operations,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("safe AI mod runtime", () => {
  beforeEach(() => {
    window.location.hash = "#?page=/assessments";
    document.body.innerHTML = `
      <section id="selected" aria-label="Old label">
        <h2 class="title">Old title</h2>
        <p class="description">One old old</p>
      </section>
      <p id="outside">Outside</p>
    `;
  });

  it("applies the supported standard-library operations", () => {
    const cleanup = applyModRecipe(
      recipe([
        {
          type: "setText",
          selector: ":scope .title",
          text: "New title",
        },
        {
          type: "replaceText",
          selector: ":scope .description",
          search: "old",
          replacement: "new",
          all: true,
        },
        {
          type: "setAttribute",
          selector: ":scope",
          name: "aria-label",
          value: "New label",
        },
        {
          type: "setStyle",
          selector: ":scope",
          property: "border-radius",
          value: "12px",
        },
        {
          type: "addClass",
          selector: ":scope",
          className: "custom-card",
        },
        {
          type: "hide",
          selector: ":scope .description",
        },
        {
          type: "insertText",
          selector: ":scope",
          position: "append",
          tag: "span",
          text: "Generated note",
          className: "note",
        },
      ]),
      document,
    );

    const selected = document.querySelector<HTMLElement>("#selected")!;
    expect(selected.querySelector(".title")?.textContent).toBe("New title");
    expect(selected.querySelector(".description")?.textContent).toBe(
      "One new new",
    );
    expect(selected.querySelector<HTMLElement>(".description")?.style.display).toBe(
      "none",
    );
    expect(
      selected.querySelector<HTMLElement>(".description")?.style.getPropertyPriority(
        "display",
      ),
    ).toBe("important");
    expect(selected.getAttribute("aria-label")).toBe("New label");
    expect(selected.style.borderRadius).toBe("12px");
    expect(selected.style.getPropertyPriority("border-radius")).toBe("important");
    expect(selected.classList.contains("custom-card")).toBe(true);
    expect(selected.querySelector(".note")?.textContent).toBe("Generated note");

    cleanup();
    expect(selected.querySelector(".title")?.textContent).toBe("Old title");
    expect(selected.querySelector(".description")?.textContent).toBe(
      "One old old",
    );
    expect(selected.querySelector<HTMLElement>(".description")?.style.display).toBe(
      "",
    );
    expect(selected.getAttribute("aria-label")).toBe("Old label");
    expect(selected.style.borderRadius).toBe("");
    expect(selected.classList.contains("custom-card")).toBe(false);
    expect(selected.querySelector(".note")).toBeNull();
  });

  it("never changes nodes outside the captured root", () => {
    const cleanup = applyModRecipe(
      recipe([{ type: "setText", selector: ":scope #outside", text: "Changed" }]),
      document,
    );

    expect(document.querySelector("#outside")?.textContent).toBe("Outside");
    cleanup();
  });

  it("applies setStyle with important priority to beat page CSS caps", () => {
    window.location.hash = "#?page=/news";
    document.body.innerHTML = `
      <div class="home-root" id="selected">
        <div class="home-container">News</div>
      </div>
    `;

    const cleanup = applyModRecipe(
      recipe(
        [
          {
            type: "setStyle",
            selector: ":scope > div.home-container",
            property: "max-width",
            value: "100%",
          },
          {
            type: "setStyle",
            selector: ":scope > div.home-container",
            property: "width",
            value: "100%",
          },
        ],
        { route: "news" },
      ),
      document,
    );

    const container = document.querySelector<HTMLElement>(".home-container")!;
    expect(container.style.getPropertyValue("max-width")).toBe("100%");
    expect(container.style.getPropertyPriority("max-width")).toBe("important");
    expect(container.style.getPropertyValue("width")).toBe("100%");
    expect(container.style.getPropertyPriority("width")).toBe("important");

    cleanup();
  });

  it("reconciles enabled recipes after a SPA remount and restores on stop", async () => {
    jest.useFakeTimers();
    const runtime = new ModRuntime(document, () => "assessments");
    runtime.start();
    runtime.setRecipes(
      recipe([{ type: "setText", selector: ":scope .title", text: "Changed" }]),
    );
    expect(document.querySelector(".title")?.textContent).toBe("Changed");

    document.querySelector("#selected")!.outerHTML =
      '<section id="selected"><h2 class="title">Remounted</h2></section>';
    await Promise.resolve();
    jest.runOnlyPendingTimers();
    expect(document.querySelector(".title")?.textContent).toBe("Changed");

    runtime.stop();
    expect(document.querySelector(".title")?.textContent).toBe("Remounted");
    jest.useRealTimers();
  });

  it("applies only enabled recipes matching the current route", () => {
    const runtime = new ModRuntime(document, () => "courses");
    runtime.start();
    runtime.setRecipes([
      recipe([{ type: "setText", selector: ":scope .title", text: "Wrong" }]),
      recipe(
        [{ type: "setText", selector: ":scope .title", text: "Disabled" }],
        { id: "mod-2", route: "courses", enabled: false },
      ),
    ]);

    expect(document.querySelector(".title")?.textContent).toBe("Old title");
    runtime.stop();
  });
});
