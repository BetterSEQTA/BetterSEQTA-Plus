import type { IndexItem, Job } from "../types";

const fetchSubjects = async () => {
  const res = await fetch(`${location.origin}/seqta/student/load/subjects`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ mode: "list" }),
  });

  const data = await res.json();
  return data;
};

export const subjectsJob: Job = {
  id: "subjects",
  label: "Subjects",
  renderComponentId: "subject",
  frequency: {
    type: "expiry",
    afterMs: 1000 * 60 * 60 * 24 * 30,
  },
  boostCriteria: (item, searchTerm) => {
    if (searchTerm == "") {
      return -100;
    }

    let score = 0;
    if (item.metadata.isActive) {
      score += 0.01; // Boost for active subjects
    } else {
      score -= 50; // Penalty for inactive subjects
    }
    
    return score;
  },

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

        const isActive = semester.active === 1;

        // Create two items for each subject - one for assessments and one for course
        const assessmentsItem = {
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
            isActive
          },
          actionId: "subjectassessment",
          renderComponentId: "subject",
        };
        
        const courseItem = {
          id: `${id}-course`,
          text: `${subject.title}`,
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
            isActive
          },
          actionId: "subjectcourse",
          renderComponentId: "subject",
        };

        items.push(
          assessmentsItem,
          courseItem
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