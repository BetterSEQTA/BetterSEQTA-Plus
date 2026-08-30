import {
  createStoredRecipe,
  extractJsonFromModelText,
  normalizeStyleProperty,
  parseGeneratedModDraft,
  parseStoredRecipes,
} from "./recipeSchema";

describe("AI mod recipe validation", () => {
  const validDraft = {
    name: "Calmer assessment card",
    description: "Makes the selected card easier to scan.",
    operations: [
      {
        type: "setStyle",
        selector: ":scope",
        property: "border-radius",
        value: "16px",
      },
      {
        type: "setText",
        selector: ":scope .title",
        text: "Upcoming assessment",
      },
    ],
  };

  it("accepts a safe generated draft and creates a stored recipe", () => {
    const draft = parseGeneratedModDraft(JSON.stringify(validDraft));
    const recipe = createStoredRecipe(draft, {
      rootSelector: "#assessment-42",
      route: "assessments",
      now: 1_700_000_000_000,
      id: "mod-1",
    });

    expect(recipe).toMatchObject({
      schemaVersion: 1,
      id: "mod-1",
      enabled: false,
      rootSelector: "#assessment-42",
      route: "assessments",
      name: validDraft.name,
      createdAt: 1_700_000_000_000,
    });
  });

  it.each([
    {
      label: "script-like attribute",
      operation: {
        type: "setAttribute",
        selector: ":scope",
        name: "onclick",
        value: "alert(1)",
      },
    },
    {
      label: "network-capable CSS",
      operation: {
        type: "setStyle",
        selector: ":scope",
        property: "background-image",
        value: "url(https://attacker.invalid/pixel)",
      },
    },
    {
      label: "selector escaping the selected root",
      operation: {
        type: "hide",
        selector: "body",
      },
    },
    {
      label: "raw executable operation",
      operation: {
        type: "javascript",
        code: "document.cookie",
      },
    },
  ])("rejects $label", ({ operation }) => {
    expect(() =>
      parseGeneratedModDraft(
        JSON.stringify({
          ...validDraft,
          operations: [operation],
        }),
      ),
    ).toThrow();
  });

  it("extracts JSON from fenced model output", () => {
    const json = JSON.stringify(validDraft);
    expect(parseGeneratedModDraft(`\`\`\`json\n${json}\n\`\`\``)).toMatchObject({
      name: validDraft.name,
    });
    expect(extractJsonFromModelText(`Here is the mod:\n${json}`)).toBe(json);
  });

  it("normalizes common model operation shapes", () => {
    expect(
      parseGeneratedModDraft(
        JSON.stringify({
          name: "Aliased mod",
          description: "Uses alternate field names",
          operations: [
            {
              setStyle: {
                target: ":scope",
                styleProperty: "border-radius",
                styleValue: "12px",
              },
            },
            {
              action: "hide",
              element: ":scope .meta",
            },
          ],
        }),
      ),
    ).toMatchObject({
      name: "Aliased mod",
      operations: [
        {
          type: "setStyle",
          selector: ":scope",
          property: "border-radius",
          value: "12px",
        },
        { type: "hide", selector: ":scope .meta" },
      ],
    });
  });

  it.each([
    ["flexWrap", "flex-wrap"],
    ["alignItems", "align-items"],
    ["gridTemplateColumns", "grid-template-columns"],
    ["flexDirection", "flex-direction"],
    ["overflowX", "overflow-x"],
    ["zIndex", "z-index"],
    ["whiteSpace", "white-space"],
    ["border-radius", "border-radius"],
  ])("normalizes style property %s to %s", (input, expected) => {
    expect(normalizeStyleProperty(input)).toBe(expected);
  });

  it("accepts camelCase style properties from the model", () => {
    expect(
      parseGeneratedModDraft(
        JSON.stringify({
          name: "Flex layout",
          description: "Uses camelCase property names",
          operations: [
            {
              type: "setStyle",
              selector: ":scope",
              property: "flexWrap",
              value: "wrap",
            },
            {
              type: "setStyle",
              selector: ":scope",
              property: "alignItems",
              value: "center",
            },
          ],
        }),
      ),
    ).toMatchObject({
      operations: [
        { type: "setStyle", property: "flex-wrap", value: "wrap" },
        { type: "setStyle", property: "align-items", value: "center" },
      ],
    });
  });

  it("accepts newly allowed layout style properties", () => {
    expect(
      parseGeneratedModDraft(
        JSON.stringify({
          name: "Grid layout",
          description: "CSS grid on selected root",
          operations: [
            {
              type: "setStyle",
              selector: ":scope",
              property: "display",
              value: "grid",
            },
            {
              type: "setStyle",
              selector: ":scope",
              property: "grid-template-columns",
              value: "repeat(3, 1fr)",
            },
          ],
        }),
      ).operations,
    ).toHaveLength(2);
  });

  it("accepts advancedScript-only mods with no declarative operations", () => {
    const draft = parseGeneratedModDraft(
      JSON.stringify({
        name: "House next to ID",
        description: "Moves house info beside the user ID",
        operations: [],
        advancedScript:
          "const house = bsplus.select(':scope .userInfohouse'); return () => {};",
      }),
    );

    expect(draft.operations).toEqual([]);
    expect(draft.advancedScript).toContain("bsplus.select");
  });

  it("rejects mods with neither operations nor advancedScript", () => {
    expect(() =>
      parseGeneratedModDraft(
        JSON.stringify({
          name: "Empty mod",
          description: "Does nothing",
          operations: [],
        }),
      ),
    ).toThrow("at least one operation or an advancedScript");
  });

  it("rejects oversized or non-JSON model output", () => {
    expect(() => parseGeneratedModDraft("not json")).toThrow();
    expect(() =>
      parseGeneratedModDraft(
        JSON.stringify({
          ...validDraft,
          name: "x".repeat(121),
        }),
      ),
    ).toThrow();
  });

  it("validates every imported recipe before returning any", () => {
    const recipe = createStoredRecipe(
      parseGeneratedModDraft(JSON.stringify(validDraft)),
      {
        rootSelector: "#assessment-42",
        route: "assessments",
        now: 1,
        id: "mod-1",
      },
    );

    expect(parseStoredRecipes(JSON.stringify([recipe]))).toEqual([recipe]);
    expect(() =>
      parseStoredRecipes(
        JSON.stringify([
          recipe,
          {
            ...recipe,
            id: "bad",
            operations: [{ type: "hide", selector: "html" }],
          },
        ]),
      ),
    ).toThrow();
  });
});
