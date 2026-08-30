/** @jest-environment jsdom */

import { buildSelectedElementContext } from "./pageContext";

describe("selected element context", () => {
  it("sends only the selected subtree and redacts active content and values", () => {
    document.body.innerHTML = `
      <div id="outside">Never include me</div>
      <section id="selected" onclick="steal()" data-session="secret">
        <input value="student@example.test" placeholder="Email">
        <a href="https://example.test/token?secret=1">Assessment details</a>
        <script>window.secret = "bad"</script>
        <p>Selected text</p>
      </section>
    `;
    const selected = document.querySelector<HTMLElement>("#selected")!;

    const context = buildSelectedElementContext(selected, {
      route: "assessments",
      rootSelector: "#selected",
      request: "Make this clearer",
      userContext: "This is an assessment card.",
    });

    expect(context.selectedHtml).toContain("Selected text");
    expect(context.selectedHtml).not.toContain("Never include me");
    expect(context.selectedHtml).not.toContain("student@example.test");
    expect(context.selectedHtml).not.toContain("onclick");
    expect(context.selectedHtml).not.toContain("data-session");
    expect(context.selectedHtml).not.toContain("<script");
    expect(context.selectedHtml).not.toContain("secret=1");
    expect(context.domCatalog.length).toBeGreaterThan(0);
    expect(context.domCatalog[0]).toMatchObject({
      selector: ":scope",
      tag: "section",
    });
    expect(context).toMatchObject({
      route: "assessments",
      rootSelector: "#selected",
      request: "Make this clearer",
      userContext: "This is an assessment card.",
      tagName: "section",
    });
  });

  it("includes parent context and a layout catalog for nested structures", () => {
    document.body.innerHTML = `
      <div class="titlebar">
        <div class="userInfo">
          <div class="userInfoText" style="display: flex; flex-direction: column; align-items: flex-end;">
            <div style="display: flex; align-items: center;">
              <p class="userInfohouse userInfoCode">Y11HA</p>
              <p class="userInfoName">Jaxon Lewis-Wilson</p>
            </div>
            <p class="userInfoCode">15845 // 33804833</p>
          </div>
        </div>
      </div>
    `;
    const selected = document.querySelector<HTMLElement>(".userInfoText")!;

    const context = buildSelectedElementContext(selected, {
      route: "welcome",
      rootSelector: ".userInfoText",
      request: "Move house next to ID",
      userContext: "",
    });

    expect(context.ancestorHtml).toContain("userInfo");
    expect(context.selectedHtml).toContain('display: flex');
    expect(context.domCatalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tag: "p",
          classes: ["userInfoCode"],
          directText: "15845 // 33804833",
        }),
        expect.objectContaining({
          tag: "p",
          classes: expect.arrayContaining(["userInfohouse", "userInfoCode"]),
          directText: "Y11HA",
        }),
      ]),
    );
    expect(
      context.domCatalog.find((entry) => entry.selector === ":scope")?.layout,
    ).toMatchObject({
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
    });
  });

  it("caps all user-controlled fields", () => {
    const selected = document.createElement("div");
    selected.textContent = "x".repeat(30_000);
    document.body.appendChild(selected);

    const context = buildSelectedElementContext(selected, {
      route: "r".repeat(2_000),
      rootSelector: "#selected",
      request: "q".repeat(5_000),
      userContext: "c".repeat(8_000),
    });

    expect(context.selectedHtml.length).toBeLessThanOrEqual(24_000);
    expect(context.route.length).toBeLessThanOrEqual(256);
    expect(context.request.length).toBeLessThanOrEqual(2_000);
    expect(context.userContext.length).toBeLessThanOrEqual(4_000);
    expect(context.domCatalog.length).toBeLessThanOrEqual(100);
  });

  it("captures only a small allowlisted computed-style summary", () => {
    const selected = document.createElement("div");
    selected.style.color = "rgb(1, 2, 3)";
    selected.style.backgroundColor = "rgb(4, 5, 6)";
    selected.style.backgroundImage = "url(https://example.test/pixel)";
    document.body.appendChild(selected);

    const context = buildSelectedElementContext(selected, {
      route: "",
      rootSelector: "div",
      request: "Restyle",
      userContext: "",
    });

    expect(context.computedStyle).toMatchObject({
      color: "rgb(1, 2, 3)",
      backgroundColor: "rgb(4, 5, 6)",
    });
    expect(context.computedStyle).not.toHaveProperty("backgroundImage");
  });

  it("includes parent chain summaries for placement context", () => {
    document.body.innerHTML = `
      <div class="titlebar" style="display: flex; align-items: center;">
        <div class="userInfo" style="display: flex;">
          <div class="userInfoText" style="display: flex; flex-direction: column;">
            <p class="userInfoCode">15845</p>
          </div>
        </div>
      </div>
    `;
    const selected = document.querySelector<HTMLElement>(".userInfoText")!;

    const context = buildSelectedElementContext(selected, {
      route: "welcome",
      rootSelector: ".userInfoText",
      request: "Reorder items",
      userContext: "",
    });

    expect(context.parentChain).toEqual([
      expect.objectContaining({
        tag: "div",
        classes: ["userInfo"],
        layout: expect.objectContaining({ display: "flex" }),
      }),
      expect.objectContaining({
        tag: "div",
        classes: ["titlebar"],
        layout: expect.objectContaining({
          display: "flex",
          alignItems: "center",
        }),
      }),
    ]);
    expect(context.structuralHints).toMatchObject({
      hasTable: false,
      hasList: false,
      primaryClasses: ["userInfoText"],
    });
  });

  it("includes table and list structure counts in root catalog and hints", () => {
    document.body.innerHTML = `
      <table class="assessmentTable">
        <tr><th>Name</th><th>Grade</th><th>Due</th></tr>
        <tr><td>Essay</td><td>A</td><td>Mon</td></tr>
        <tr><td>Quiz</td><td>B</td><td>Tue</td></tr>
      </table>
    `;
    const table = document.querySelector<HTMLElement>(".assessmentTable")!;

    const tableContext = buildSelectedElementContext(table, {
      route: "assessments",
      rootSelector: ".assessmentTable",
      request: "Highlight header row",
      userContext: "",
    });

    expect(
      tableContext.domCatalog.find((entry) => entry.selector === ":scope"),
    ).toMatchObject({
      rowCount: 3,
      columnCount: 3,
    });
    expect(tableContext.structuralHints).toMatchObject({
      hasTable: true,
      hasList: false,
      rowCount: 3,
      columnCount: 3,
      primaryClasses: ["assessmentTable"],
    });

    document.body.innerHTML = `
      <ul class="taskList">
        <li>Task one</li>
        <li>Task two</li>
        <li>Task three</li>
      </ul>
    `;
    const list = document.querySelector<HTMLElement>(".taskList")!;

    const listContext = buildSelectedElementContext(list, {
      route: "tasks",
      rootSelector: ".taskList",
      request: "Bold first item",
      userContext: "",
    });

    expect(
      listContext.domCatalog.find((entry) => entry.selector === ":scope"),
    ).toMatchObject({
      itemCount: 3,
    });
    expect(listContext.structuralHints).toMatchObject({
      hasTable: false,
      hasList: true,
      itemCount: 3,
      primaryClasses: ["taskList"],
    });
  });
});
