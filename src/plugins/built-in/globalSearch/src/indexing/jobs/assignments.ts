import type { Job, IndexItem } from "../types";
import { htmlToPlainText } from "../utils";

const fetchJSON = async (url: string, body: any) => {
  const res = await fetch(`${location.origin}${url}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  return res.json();
};

const fetchUpcomingAssessments = async (student: number = 69) => {
  try {
    const res = await fetchJSON("/seqta/student/assessment/list/upcoming?", {
      student,
    });
    return res.payload || [];
  } catch (e) {
    console.error("[Assignments job] Failed to fetch upcoming assessments:", e);
    return [];
  }
};

const fetchSubjects = async () => {
  try {
    const res = await fetchJSON("/seqta/student/load/subjects?", {});
    return res.payload
      ?.filter((s: any) => s.active === 1)
      ?.flatMap((s: any) => s.subjects) || [];
  } catch (e) {
    console.error("[Assignments job] Failed to fetch subjects:", e);
    return [];
  }
};

const fetchPastAssessments = async (student: number = 69, subjects: any[]) => {
  const map: Record<number, any> = {};
  
  for (const subject of subjects) {
    try {
      const res = await fetchJSON("/seqta/student/assessment/list/past?", {
        student,
        metaclass: subject.metaclass,
        programme: subject.programme,
      });
      
      if (res.payload && Array.isArray(res.payload)) {
        res.payload.forEach((assessment: any) => {
          if (assessment && assessment.id) {
            map[assessment.id] = assessment;
          }
        });
      }
    } catch (e) {
      console.warn(`[Assignments job] Failed to fetch past assessments for subject ${subject.code}:`, e);
    }
  }
  
  return Object.values(map);
};

const fetchAssessmentDetails = async (
  assessmentId: number,
  metaclassId: number,
  programmeId: number,
): Promise<string | null> => {
  try {
    const res = await fetchJSON("/seqta/student/assessment/view?", {
      id: assessmentId,
      metaclass: metaclassId,
      programme: programmeId,
    });
    
    if (res.payload && res.payload.description) {
      return htmlToPlainText(res.payload.description);
    }
    return null;
  } catch (e) {
    console.warn(`[Assignments job] Failed to fetch details for assessment ${assessmentId}:`, e);
    return null;
  }
};

export const assignmentsJob: Job = {
  id: "assignments",
  label: "Assignments",
  renderComponentId: "assessment",
  frequency: { type: "expiry", afterMs: 1000 * 60 * 60 * 24 }, // Daily
  
  boostCriteria: (item, searchTerm) => {
    if (searchTerm === "") {
      return -100;
    }

    let score = 0;
    
    // Boost upcoming assignments
    if (item.metadata.dueDate) {
      const dueDate = new Date(item.metadata.dueDate).getTime();
      const now = Date.now();
      const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);
      
      if (daysUntilDue >= 0 && daysUntilDue <= 7) {
        score += 0.05; // Boost assignments due within a week
      }
      if (daysUntilDue < 0) {
        score -= 0.1; // Penalty for overdue assignments
      }
    }
    
    // Boost if submitted
    if (item.metadata.submitted) {
      score += 0.02;
    }
    
    return score;
  },

  run: async (ctx) => {
    const existingIds = new Set(
      (await ctx.getStoredItems("assignments")).map((i) => i.id),
    );

    const student = 69; // TODO: Get from context if available
    
    // Fetch data in parallel
    const [upcoming, subjects] = await Promise.all([
      fetchUpcomingAssessments(student),
      fetchSubjects(),
    ]);

    // Fetch past assessments
    const past = await fetchPastAssessments(student, subjects);
    
    // Combine and deduplicate
    const allAssessments = new Map<number, any>();
    
    upcoming.forEach((a: any) => {
      if (a && a.id) {
        allAssessments.set(a.id, { ...a, isUpcoming: true });
      }
    });
    
    past.forEach((a: any) => {
      if (a && a.id) {
        const existing = allAssessments.get(a.id);
        if (existing) {
          Object.assign(existing, a);
        } else {
          allAssessments.set(a.id, { ...a, isUpcoming: false });
        }
      }
    });

    const items: IndexItem[] = [];
    const processedIds = new Set<string>();

    // Process assessments in batches to avoid overwhelming the API
    const assessmentArray = Array.from(allAssessments.values());
    const batchSize = 15; // Increased batch size for better performance
    
    // Only fetch details for upcoming assignments to reduce API calls
    const upcomingAssessments = assessmentArray.filter(a => a.isUpcoming);
    const detailPromises = new Map<string, Promise<string | null>>();
    
    // Pre-fetch details for upcoming assessments only (most important)
    for (const assessment of upcomingAssessments.slice(0, 20)) {
      if (assessment.metaclass && assessment.programme) {
        const id = `assignment-${assessment.id}`;
        detailPromises.set(id, fetchAssessmentDetails(
          assessment.id,
          assessment.metaclass,
          assessment.programme,
        ));
      }
    }
    
    // Process all assessments
    for (let i = 0; i < assessmentArray.length; i += batchSize) {
      const batch = assessmentArray.slice(i, i + batchSize);
      
      const batchItems = await Promise.all(
        batch.map(async (assessment) => {
          const id = `assignment-${assessment.id}`;
          
          if (existingIds.has(id) || processedIds.has(id)) {
            return null;
          }
          
          processedIds.add(id);

          // Only fetch details for upcoming assignments (already pre-fetched)
          let description = "";
          const detailPromise = detailPromises.get(id);
          if (detailPromise) {
            description = (await detailPromise) || "";
          }

          const subjectName = assessment.subject || assessment.code || "Unknown Subject";
          const dueDate = assessment.due ? new Date(assessment.due).getTime() : null;
          
          const item: IndexItem = {
            id,
            text: assessment.title || assessment.name || "Untitled Assignment",
            category: "assignments",
            content: `${description}\nSubject: ${subjectName}\nDue: ${assessment.due || "No due date"}`.trim(),
            dateAdded: dueDate || Date.now(),
            metadata: {
              assessmentId: assessment.id,
              subject: subjectName,
              subjectCode: assessment.code,
              dueDate: assessment.due,
              programmeId: assessment.programme,
              metaclassId: assessment.metaclass,
              submitted: assessment.submitted || false,
              isUpcoming: assessment.isUpcoming || false,
              term: assessment.term,
            },
            actionId: "assessment",
            renderComponentId: "assessment",
          };

          return item;
        })
      );
      
      // Filter out nulls and add to items
      batchItems.forEach(item => {
        if (item) {
          items.push(item);
        }
      });
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < assessmentArray.length) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Reduced delay
      }
    }

    console.debug(`[Assignments job] Indexed ${items.length} assignment items`);
    return items;
  },

  purge: (items) => {
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    return items.filter((i) => {
      // Keep upcoming assignments and assignments from the last year
      if (i.metadata.isUpcoming) {
        return true;
      }
      return i.dateAdded >= oneYearAgo;
    });
  },
};

