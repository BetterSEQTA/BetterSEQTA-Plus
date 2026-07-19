import {
  normalizeTeachPath,
  pathMatchesTeachNavHref,
  resolveTeachSpineWorkspace,
} from "./teachChrome";

describe("teachChrome", () => {
  it("normalizes paths", () => {
    expect(normalizeTeachPath("/forum/")).toBe("/forum");
    expect(normalizeTeachPath("/forum?x=1")).toBe("/forum");
    expect(normalizeTeachPath("/")).toBe("/");
  });

  it("matches page-list hrefs by prefix", () => {
    expect(
      pathMatchesTeachNavHref("/programme/3831/editOnlineLessons", "/programme"),
    ).toBe(true);
    expect(pathMatchesTeachNavHref("/forum", "/programme")).toBe(false);
    expect(
      pathMatchesTeachNavHref(
        "/attendance/29247/roll",
        "/attendance/29247/roll?meta=1",
      ),
    ).toBe(true);
  });

  it("matches BetterSEQTA home route", () => {
    expect(
      pathMatchesTeachNavHref("/betterseqta-home", "/betterseqta-home"),
    ).toBe(true);
    expect(pathMatchesTeachNavHref("/welcome", "/betterseqta-home")).toBe(
      false,
    );
  });

  it("does not treat programmeList as programme", () => {
    expect(pathMatchesTeachNavHref("/programmeList", "/programme")).toBe(
      false,
    );
    expect(pathMatchesTeachNavHref("/programme/1", "/programme")).toBe(true);
  });

  it("resolves spine workspaces", () => {
    expect(resolveTeachSpineWorkspace("/betterseqta-home")).toBe("home");
    expect(resolveTeachSpineWorkspace("/help")).toBe("home");
    expect(resolveTeachSpineWorkspace("/timetable/542/myday")).toBe(
      "teaching",
    );
    expect(resolveTeachSpineWorkspace("/studentSummary/brief")).toBe(
      "pastoral",
    );
    expect(resolveTeachSpineWorkspace("/academic/edit")).toBe("admin");
    expect(
      resolveTeachSpineWorkspace(
        "/portal/da6983d6-bb49-4a07-9fbd-62699dc7225e",
      ),
    ).toBe("portal");
  });
});
