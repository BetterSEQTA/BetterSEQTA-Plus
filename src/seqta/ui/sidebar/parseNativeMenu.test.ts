/**
 * @jest-environment jsdom
 */
import {
  findNativeMenuEntry,
  folderNeedsNativePopulate,
  getPagePathFromHash,
  parseNativeMenu,
} from "./parseNativeMenu";

describe("parseNativeMenu", () => {
  it("parses top-level items and nested folders", () => {
    document.body.innerHTML = `
      <div id="menu">
        <ul>
          <li class="item" data-key="home" id="homebutton" data-path="/home" data-betterseqta="true">
            <label><svg></svg><span>Home</span></label>
          </li>
          <li class="item hasChildren" data-key="assessments" data-path="/assessments">
            <label><svg></svg><span>Assessments</span></label>
            <div class="sub"><ul>
              <li class="item betterseqta-assessments-overview-item" data-betterseqta="true">
                <label>Overview</label>
              </li>
              <li class="item" data-key="upcoming" data-path="/assessments/upcoming">
                <label>Upcoming</label>
              </li>
            </ul></div>
          </li>
        </ul>
      </div>
    `;

    const menu = document.getElementById("menu")!;
    const items = parseNativeMenu(menu);

    expect(items.map((i) => i.key)).toEqual(["home", "assessments"]);
    expect(items[0].betterseqta).toBe(true);
    expect(items[1].hasChildren).toBe(true);
    expect(items[1].children.map((c) => c.key)).toEqual([
      "assessments-overview",
      "upcoming",
    ]);
    expect(items[1].children[0].label).toBe("Overview");
  });

  it("reads page path from hash", () => {
    expect(getPagePathFromHash("#?page=/timetable")).toBe("/timetable");
    expect(getPagePathFromHash("#?page=/assessments/upcoming&x=1")).toBe(
      "/assessments/upcoming",
    );
  });

  it("ignores the custom Svelte sidebar list when parsing", () => {
    document.body.innerHTML = `
      <div id="menu">
        <ul class="logo-link">
          <li class="item" data-key="home" data-path="/home">
            <label>Home</label>
          </li>
        </ul>
        <ul id="bsplus-sidebar-root" class="logo-link bsplus-sidebar-list">
          <li class="item" data-key="fake" data-path="/fake">
            <label>Fake</label>
          </li>
        </ul>
      </div>
    `;

    const menu = document.getElementById("menu")!;
    const items = parseNativeMenu(menu);

    expect(items.map((i) => i.key)).toEqual(["home"]);
  });

  it("findNativeMenuEntry prefers path over duplicate data-key", () => {
    document.body.innerHTML = `
      <div id="menu">
        <ul>
          <li class="item hasChildren" data-key="courses" data-path="/courses">
            <label>Courses</label>
            <div class="sub"><ul>
              <li class="item hasChildren" data-key="4804:11066">
                <label>English</label>
                <div class="sub"><ul>
                  <li class="item" data-key="4804:11066" data-path="/courses/4804:11066">
                    <label>Course</label>
                  </li>
                  <li class="item" data-key="4804:11066" data-path="/assessments/4804:11066">
                    <label>Assessments</label>
                  </li>
                </ul></div>
              </li>
            </ul></div>
          </li>
        </ul>
      </div>
    `;

    const menu = document.getElementById("menu")!;
    const course = findNativeMenuEntry(menu, {
      key: "4804:11066",
      id: null,
      path: "/courses/4804:11066",
      label: "Course",
    });
    const assessments = findNativeMenuEntry(menu, {
      key: "4804:11066",
      id: null,
      path: "/assessments/4804:11066",
      label: "Assessments",
    });

    expect(course?.dataset.path).toBe("/courses/4804:11066");
    expect(assessments?.dataset.path).toBe("/assessments/4804:11066");
  });

  it("synthesizes assessment subject paths when SEQTA omits data-path", () => {
    document.body.innerHTML = `
      <div id="menu">
        <ul>
          <li class="item hasChildren" data-key="assessments" data-path="/assessments">
            <label>Assessments</label>
            <div class="sub"><ul>
              <li class="item hasChildren">
                <label>Year 12</label>
                <div class="sub"><ul>
                  <li class="item" data-key="4804:11066" data-colour="#f00">
                    <label>English</label>
                  </li>
                </ul></div>
              </li>
            </ul></div>
          </li>
          <li class="item hasChildren" data-key="courses" data-path="/courses">
            <label>Courses</label>
            <div class="sub"><ul>
              <li class="item hasChildren" data-key="4804:11066">
                <label>English</label>
                <div class="sub"><ul>
                  <li class="item" data-key="4804:11066" data-path="/courses/4804:11066">
                    <label>Course</label>
                  </li>
                </ul></div>
              </li>
            </ul></div>
          </li>
        </ul>
      </div>
    `;

    const menu = document.getElementById("menu")!;
    const items = parseNativeMenu(menu);
    const english = items
      .find((item) => item.key === "assessments")
      ?.children[0]?.children[0];

    expect(english?.path).toBe("/assessments/4804:11066");

    const native = findNativeMenuEntry(menu, {
      key: "4804:11066",
      id: null,
      path: english?.path ?? null,
      label: "English",
    });

    expect(native?.closest("[data-key='assessments']")).not.toBeNull();
    expect(native?.closest("[data-key='courses']")).toBeNull();
  });

  it("detects assessments/courses folders that still need SEQTA to populate subjects", () => {
    expect(
      folderNeedsNativePopulate({
        key: "assessments",
        path: "/assessments",
        id: null,
        label: "Assessments",
        iconHtml: "",
        hasChildren: true,
        itemColour: null,
        betterseqta: false,
        children: [
          {
            key: "assessments-overview",
            path: null,
            id: null,
            label: "Overview",
            iconHtml: "",
            hasChildren: false,
            itemColour: null,
            betterseqta: true,
            children: [],
          },
        ],
      }),
    ).toBe(true);

    expect(
      folderNeedsNativePopulate({
        key: "courses",
        path: "/courses",
        id: null,
        label: "Courses",
        iconHtml: "",
        hasChildren: true,
        itemColour: null,
        betterseqta: false,
        children: [
          {
            key: "4804:11066",
            path: "/courses/4804:11066",
            id: null,
            label: "English",
            iconHtml: "",
            hasChildren: true,
            itemColour: null,
            betterseqta: false,
            children: [],
          },
        ],
      }),
    ).toBe(false);
  });
});
