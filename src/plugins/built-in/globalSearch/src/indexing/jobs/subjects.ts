import type { IndexItem, Job } from "../types";

const fetchSubjects = async () => {
  const res = await fetch(`${location.origin}/seqta/student/load/subjects`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ mode: "list" }),
  });

  const data = await res.json();
  console.debug("[Subjects job] API response:", data);
  return data;
};

export const subjectsJob: Job = {
  id: "subjects",
  label: "Subjects",
  renderComponentId: "subject",
  frequency: "pageLoad",

  run: async (ctx) => {
    const existingIds = new Set(
      (await ctx.getStoredItems("subjects")).map((i) => i.id),
    );

    let list;
    try {
      list = await fetchSubjects();
    } catch (e) {
      console.error("[Subjects job] list fetch failed:", e);
      return [];
    }

    if (list.status !== "200") {
      console.error("[Subjects job] API returned non-200 status:", list.status);
      return [];
    }

    // Check if we have the expected data structure
    if (!list.payload || !Array.isArray(list.payload)) {
      console.error("[Subjects job] Unexpected API response structure:", list);
      return [];
    }

    const items: IndexItem[] = [];

    // Process each semester
    for (const semester of list.payload) {
      if (!semester.subjects || !Array.isArray(semester.subjects)) {
        console.warn("[Subjects job] Skipping invalid semester:", semester);
        continue;
      }

      // Process each subject in the semester
      for (const subject of semester.subjects) {
        // Skip if subject doesn't have required fields
        if (!subject || !subject.code || !subject.title) {
          console.warn("[Subjects job] Skipping invalid subject:", subject);
          continue;
        }

        const id = `${semester.code}-${subject.code}-${subject.metaclass}`;
        if (existingIds.has(id)) continue;

        // Extract year level from subject code (assuming format like "YEAR10" or "10ENG")
        const yearLevel = subject.code.match(/^YEAR(\d+)|^(\d+)/i)?.[1] || subject.code.match(/^(\d+)/)?.[1] || 0;
        const isActive = subject.active === 1;

        // Create two items for each subject - one for assessments and one for course
        items.push(
          {
            id: `${id}-assessments`,
            text: `${subject.title} Assessments`,
            category: "subjects",
            content: `View assessments for ${subject.title} (${semester.description})`,
            dateAdded: Date.now(),
            metadata: {
              subjectId: subject.metaclass,
              subjectName: subject.title,
              subjectCode: subject.code,
              programme: subject.programme,
              semesterCode: semester.code,
              semesterDescription: semester.description,
              type: "assessments",
              yearLevel: Number(yearLevel),
              isActive
            },
            actionId: "subject-assessments",
            renderComponentId: "subject",
          },
          {
            id: `${id}-course`,
            text: `${subject.title} Course`,
            category: "subjects",
            content: `View course content for ${subject.title} (${semester.description})`,
            dateAdded: Date.now(),
            metadata: {
              subjectId: subject.metaclass,
              subjectName: subject.title,
              subjectCode: subject.code,
              programme: subject.programme,
              semesterCode: semester.code,
              semesterDescription: semester.description,
              type: "course",
              yearLevel: Number(yearLevel),
              isActive
            },
            actionId: "subject-course",
            renderComponentId: "subject",
          }
        );
      }
    }

    console.debug(`[Subjects job] Indexed ${items.length} subject items`);
    return items;
  },

  purge: (items) => {
    // Keep all subjects as they are relatively static
    return items;
  },
};