import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  appointmentToLesson,
  fetchAppointments,
  fetchAssessmentsForCalendarSync,
  fetchTimetableLessons,
  parseSeqtaDateTime,
} from "./fetchTimetable";

describe("calendar source fetches", () => {
  const range = { from: "2026-07-20", until: "2026-07-26" };
  const sources = [
    {
      name: "assessments",
      path: "/assessment/list/upcoming?",
      load: fetchAssessmentsForCalendarSync,
      empty: { payload: [] },
    },
    {
      name: "appointments",
      path: "/events/load",
      load: fetchAppointments,
      empty: { payload: [] },
    },
    {
      name: "timetable",
      path: "/load/timetable?",
      load: fetchTimetableLessons,
      empty: { payload: { items: [] } },
    },
  ];

  beforeEach(() => {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: {
        origin: "https://school.seqta.com.au",
        pathname: "/",
        hash: "",
        href: "https://school.seqta.com.au/",
      },
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { body: { classList: { contains: () => false } } },
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it("uses the same Engage child for timetable and assessment sync", async () => {
    document.body.classList.contains = () => true;
    const assessmentStudents: unknown[] = [];
    const timetableStudents: unknown[] = [];
    jest.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const path = String(url);
      const body = JSON.parse(String(init?.body));
      if (path.endsWith("/seqta/parent/load/timetable")) {
        if (body.list)
          return Response.json({ payload: [{ id: "42", name: "Child" }] });
        timetableStudents.push(body.student);
        return Response.json({ payload: { items: [] } });
      }
      if (path.endsWith("/seqta/parent/assessment/list/upcoming?")) {
        assessmentStudents.push(body.student);
        return Response.json({
          payload: [
            { id: 1, title: "Essay", subject: "English", due: "2026-07-20" },
          ],
        });
      }
      if (path.includes("/seqta/student/"))
        return new Response("Wrong account endpoint", { status: 403 });
      return Response.json({ payload: [] });
    });
    await expect(fetchTimetableLessons(range)).resolves.toEqual([]);
    await expect(fetchAssessmentsForCalendarSync(range)).resolves.toMatchObject(
      [{ id: 1, title: "Essay" }],
    );
    expect(timetableStudents).toEqual([42]);
    expect(assessmentStudents).toEqual([42]);
  });

  it.each(sources)(
    "rejects failed $name fetches instead of reporting an empty source",
    async ({ path, load }) => {
      jest.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        if (String(url).endsWith(path))
          return new Response("unavailable", { status: 503 });
        return Response.json({
          payload: String(url).endsWith("/login") ? { id: 12 } : [],
        });
      });
      await expect(load(range)).rejects.toThrow("SEQTA request failed (503)");
    },
  );

  it.each(sources)(
    "rejects missing $name payloads that cannot authorize reconciliation",
    async ({ path, load }) => {
      jest.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        if (String(url).endsWith(path))
          return Response.json({ error: "Session expired" });
        return Response.json({
          payload: String(url).endsWith("/login") ? { id: 12 } : [],
        });
      });
      await expect(load(range)).rejects.toThrow();
    },
  );

  it.each(sources)(
    "accepts a successfully fetched empty $name source",
    async ({ path, load, empty }) => {
      jest.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        if (String(url).endsWith(path)) return Response.json(empty);
        return Response.json({
          payload: String(url).endsWith("/login") ? { id: 12 } : [],
        });
      });
      await expect(load(range)).resolves.toEqual([]);
    },
  );
});

describe("parseSeqtaDateTime", () => {
  it("parses SEQTA event timestamps", () => {
    expect(parseSeqtaDateTime("2026-07-20 09:30:00.0")).toEqual({
      date: "2026-07-20",
      time: "09:30",
    });
  });

  it("rejects empty values", () => {
    expect(parseSeqtaDateTime(undefined)).toBeNull();
    expect(parseSeqtaDateTime("")).toBeNull();
  });
});

describe("appointmentToLesson", () => {
  it("maps appointment payload rows into timetable lessons", () => {
    expect(
      appointmentToLesson({
        id: 5,
        from: "2026-07-20 09:30:00.0",
        until: "2026-07-20 13:10:00.0",
        event: {
          id: 5,
          title: "fsdfsdsdfdsfdsf",
          notes: "sdfsfddfsdsfdsfdfssdcfdsfsdfdsfds",
          colour: "#ffc107",
          event_type: "appointment",
        },
      }),
    ).toEqual({
      date: "2026-07-20",
      from: "09:30",
      until: "13:10",
      description: "fsdfsdsdfdsfdsf",
      type: "appointment",
      calendarid: "event:5",
      colour: "#ffc107",
      notes: "sdfsfddfsdsfdsfdfssdcfdsfsdfdsfds",
    });
  });

  it("skips incomplete appointment rows", () => {
    expect(
      appointmentToLesson({
        from: "2026-07-20 09:30:00.0",
        until: "2026-07-20 13:10:00.0",
        event: { title: "" },
      }),
    ).toBeNull();
  });
});
