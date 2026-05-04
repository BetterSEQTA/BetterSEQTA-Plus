import { getUserInfo } from "@/seqta/ui/AddBetterSEQTAElements";
import {
  isBetterseqtaWasmReady,
  normalizeSeqtaSubjectHexColour,
  parseSeqtaCoursesAssessmentsPageJson,
} from "@/wasm/init";

/**
 * Parses the current page from window.location.hash.
 * Supports both old and current URL formats, e.g.
 *   /courses/SEMESTER/X:Y and /courses/X:Y
 *   /assessments/SEMESTER/X:Y and /assessments/X:Y
 * e.g. #?page=/courses/2023S/4804:11066,
 *      #?page=/courses/4804:11066,
 *      #?page=/assessments/2023S/4621:10772,
 *      #?page=/assessments/4621:10772
 */
function parsePageContext(): { programme: number; metaclass: number } | null {
  const hash = window.location.hash || "";
  if (isBetterseqtaWasmReady()) {
    try {
      const json = parseSeqtaCoursesAssessmentsPageJson(hash);
      if (json) {
        const o = JSON.parse(json) as { programme: number; metaclass: number };
        if (
          typeof o.programme === "number" &&
          typeof o.metaclass === "number" &&
          !Number.isNaN(o.programme) &&
          !Number.isNaN(o.metaclass)
        ) {
          return { programme: o.programme, metaclass: o.metaclass };
        }
      }
    } catch {
      /* fall through */
    }
  }
  const match = hash.match(/[?&]page=\/(courses|assessments)\/(?:[^/]+\/)?(\d+):(\d+)/);
  if (!match) return null;
  const programme = parseInt(match[2], 10);
  const metaclass = parseInt(match[3], 10);
  if (isNaN(programme) || isNaN(metaclass)) return null;
  return { programme, metaclass };
}

/**
 * Fetches subjects and finds the subject matching programme:metaclass.
 */
async function getSubjectCode(
  programme: number,
  metaclass: number
): Promise<string | null> {
  try {
    const res = await fetch(`${location.origin}/seqta/student/load/subjects?`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    const payload = data?.payload;
    if (!Array.isArray(payload)) return null;

    for (const semester of payload) {
      const subjects = semester?.subjects;
      if (!Array.isArray(subjects)) continue;
      const subject = subjects.find(
        (s: any) =>
          s &&
          Number(s.programme) === programme &&
          Number(s.metaclass) === metaclass
      );
      if (subject?.code) return subject.code;
    }
    return null;
  } catch (error) {
    console.warn("[BetterSEQTA+] Adaptive theme: failed to load subjects:", error);
    return null;
  }
}

/**
 * Fetches user prefs and returns the colour for the given subject code.
 */
async function getSubjectColour(
  subjectCode: string,
  userId: number
): Promise<string | null> {
  try {
    const res = await fetch(`${location.origin}/seqta/student/load/prefs?`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        request: "userPrefs",
        asArray: true,
        user: userId,
      }),
    });
    const data = await res.json();
    const payload = data?.payload;
    if (!Array.isArray(payload)) return null;

    const pref = payload.find(
      (p: { name: string; value: string }) =>
        p.name === `timetable.subject.colour.${subjectCode}`
    );
    return pref?.value ?? null;
  } catch (error) {
    console.warn("[BetterSEQTA+] Adaptive theme: failed to load prefs:", error);
    return null;
  }
}

/**
 * Returns the adaptive theme colour for the current page context, or null.
 * When viewing a course or assessments page, returns the subject's assigned colour.
 */
export async function getAdaptiveColour(): Promise<string | null> {
  const context = parsePageContext();
  if (!context) return null;

  const subjectCode = await getSubjectCode(context.programme, context.metaclass);
  if (!subjectCode) return null;

  let userId: number;
  try {
    const userInfo = await getUserInfo();
    userId = userInfo?.id;
    if (typeof userId !== "number") return null;
  } catch {
    return null;
  }

  const colour = await getSubjectColour(subjectCode, userId);
  if (!colour || typeof colour !== "string") return null;

  if (isBetterseqtaWasmReady()) {
    try {
      const normalized = normalizeSeqtaSubjectHexColour(colour);
      if (normalized) return normalized;
    } catch {
      /* fall through */
    }
  }
  // Basic hex validation
  if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(colour)) return colour;
  if (/^[0-9A-Fa-f]{6}$/.test(colour)) return `#${colour}`;
  return null;
}
