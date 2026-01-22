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
      
      // Past assessments API returns data in payload.tasks, not payload directly
      if (res.payload && res.payload.tasks && Array.isArray(res.payload.tasks)) {
        res.payload.tasks.forEach((assessment: any) => {
          if (assessment && assessment.id) {
            // Ensure programme and metaclass are included from the subject
            map[assessment.id] = {
              ...assessment,
              programme: assessment.programme || assessment.programmeID || subject.programme,
              metaclass: assessment.metaclass || assessment.metaclassID || subject.metaclass,
            };
          }
        });
      } else if (res.payload && Array.isArray(res.payload)) {
        // Fallback: some APIs might return array directly
        res.payload.forEach((assessment: any) => {
          if (assessment && assessment.id) {
            map[assessment.id] = {
              ...assessment,
              programme: assessment.programme || assessment.programmeID || subject.programme,
              metaclass: assessment.metaclass || assessment.metaclassID || subject.metaclass,
            };
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
    
    // Create a lookup map from subject code to programme/metaclass
    const subjectLookup = new Map<string, { programme: number; metaclass: number }>();
    subjects.forEach((s: any) => {
      if (s.code && s.programme && s.metaclass) {
        subjectLookup.set(s.code, { programme: s.programme, metaclass: s.metaclass });
      }
    });
    
    // Combine and deduplicate
    const allAssessments = new Map<number, any>();
    
    upcoming.forEach((a: any) => {
      if (a && a.id) {
        // Prioritize capital ID fields (programmeID, metaclassID) as that's what the API returns
        let programme = a.programmeID || a.programme;
        let metaclass = a.metaclassID || a.metaclass;
        
        // If missing, try to get from subject lookup
        if ((!programme || !metaclass) && a.code) {
          const subjectInfo = subjectLookup.get(a.code);
          if (subjectInfo) {
            programme = programme || subjectInfo.programme;
            metaclass = metaclass || subjectInfo.metaclass;
          }
        }
        
        allAssessments.set(a.id, {
          ...a,
          programme,
          metaclass,
          programmeID: programme, // Ensure both formats are available
          metaclassID: metaclass,
          isUpcoming: true,
        });
      }
    });
    
    past.forEach((a: any) => {
      if (a && a.id) {
        // Prioritize capital ID fields (programmeID, metaclassID) as that's what the API returns
        let programme = a.programmeID || a.programme;
        let metaclass = a.metaclassID || a.metaclass;
        
        const existing = allAssessments.get(a.id);
        if (existing) {
          // Merge past assessment data, ensuring programme/metaclass are preserved
          // Use existing values if new ones are missing
          programme = programme || existing.programme || existing.programmeID;
          metaclass = metaclass || existing.metaclass || existing.metaclassID;
          
          Object.assign(existing, {
            ...a,
            programme,
            metaclass,
            programmeID: programme,
            metaclassID: metaclass,
          });
        } else {
          allAssessments.set(a.id, { 
            ...a, 
            programme,
            metaclass,
            programmeID: programme,
            metaclassID: metaclass,
            isUpcoming: false 
          });
        }
      }
    });

    const items: IndexItem[] = [];
    const processedIds = new Set<string>();

    // Process assessments in batches to avoid overwhelming the API
    const assessmentArray = Array.from(allAssessments.values());
    const pastCount = assessmentArray.filter(a => !a.isUpcoming).length;
    const upcomingCount = assessmentArray.filter(a => a.isUpcoming).length;
    console.debug(`[Assignments job] Processing ${assessmentArray.length} total assessments (${upcomingCount} upcoming, ${pastCount} past)`);
    const batchSize = 15; // Increased batch size for better performance
    
    // Skip fetching assessment details - the API endpoint doesn't exist or returns 404
    // Details are optional and not critical for search functionality
    const detailPromises = new Map<string, Promise<string | null>>();
    
    // Process all assessments
    for (let i = 0; i < assessmentArray.length; i += batchSize) {
      const batch = assessmentArray.slice(i, i + batchSize);
      
      const batchItems = await Promise.all(
        batch.map(async (assessment) => {
          const id = `assignment-${assessment.id}`;
          
          // Skip if already processed in this batch
          if (processedIds.has(id)) {
            return null;
          }
          
          processedIds.add(id);
          
          // Process all assessments (both new and existing) to ensure metadata is up-to-date
          // The indexer's merge logic will handle updates properly

          // Skip fetching details - API endpoint doesn't exist
          const description = "";

          const subjectName = assessment.subject || assessment.code || "Unknown Subject";
          const dueDate = assessment.due ? new Date(assessment.due).getTime() : null;
          
          // Prioritize capital ID fields (programmeID, metaclassID) as that's what the API returns
          const programmeId = assessment.programmeID || assessment.programme;
          const metaclassId = assessment.metaclassID || assessment.metaclass;
          
          // Validate that we have the required IDs for navigation
          if (!programmeId || !metaclassId || !assessment.id) {
            console.warn(`[Assignments job] Skipping assignment ${assessment.id} - missing required IDs:`, {
              programmeId,
              metaclassId,
              assessmentId: assessment.id,
              programmeID: assessment.programmeID,
              metaclassID: assessment.metaclassID,
              programme: assessment.programme,
              metaclass: assessment.metaclass,
              assessment,
            });
            return null;
          }
          
          // Convert to numbers, preserving 0 as valid
          let finalProgrammeId: number | undefined;
          let finalMetaclassId: number | undefined;
          
          if (programmeId !== undefined && programmeId !== null && programmeId !== '') {
            const num = Number(programmeId);
            finalProgrammeId = isNaN(num) ? undefined : num;
          }
          
          if (metaclassId !== undefined && metaclassId !== null && metaclassId !== '') {
            const num = Number(metaclassId);
            finalMetaclassId = isNaN(num) ? undefined : num;
          }
          
          // Final validation - check for actual numbers (including 0)
          if (finalProgrammeId === undefined || finalMetaclassId === undefined || !assessment.id) {
            console.error(`[Assignments job] ❌ Skipping assignment ${assessment.id} - invalid IDs after conversion:`, {
              programmeId: finalProgrammeId,
              metaclassId: finalMetaclassId,
              assessmentId: assessment.id,
              rawProgrammeId: programmeId,
              rawMetaclassId: metaclassId,
              assessment,
            });
            return null;
          }
          
          const item: IndexItem = {
            id,
            text: assessment.title || assessment.name || "Untitled Assignment",
            category: "assignments",
            content: `${description}\nSubject: ${subjectName}\nDue: ${assessment.due || "No due date"}`.trim(),
            dateAdded: dueDate || Date.now(),
            metadata: {
              assessmentId: assessment.id,
              assessmentID: assessment.id, // Store both variants for compatibility
              subject: subjectName,
              subjectCode: assessment.code,
              dueDate: assessment.due,
              programmeId: finalProgrammeId,
              programmeID: finalProgrammeId, // Store both variants for compatibility
              metaclassId: finalMetaclassId,
              metaclassID: finalMetaclassId, // Store both variants for compatibility
              submitted: assessment.submitted || false,
              isUpcoming: assessment.isUpcoming || false,
              term: assessment.term,
              timestamp: assessment.due || new Date().toISOString(), // Required by AssessmentMetadata interface
            },
            actionId: "assessment",
            renderComponentId: "assessment",
          };
          
          console.debug(`[Assignments job] ✅ Created item for assignment ${assessment.id}:`, {
            id: item.id,
            programmeId: item.metadata.programmeId,
            programmeID: item.metadata.programmeID,
            metaclassId: item.metadata.metaclassId,
            metaclassID: item.metadata.metaclassID,
            assessmentId: item.metadata.assessmentId,
            assessmentID: item.metadata.assessmentID,
          });

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

    const newItemsCount = items.filter(item => !existingIds.has(item.id)).length;
    const updatedItemsCount = items.length - newItemsCount;
    console.debug(`[Assignments job] Indexed ${items.length} assignment items (${newItemsCount} new, ${updatedItemsCount} updated)`);
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

