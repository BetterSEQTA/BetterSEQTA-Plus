import {
  resolveSeqtaLoginRole,
  seqtaLoginEndpoint,
} from "@/seqta/utils/seqtaLoginApi";

const TITLE_NOISE =
  /(?:\s*[―\-|]\s*)?(?:SEQTA\s+(?:Learn|Engage|Tutor|Teach|Mobile)|Login|Sign\s*in)\s*/gi;

const FIELD_LABELS =
  /^(?:username|password|login|sign\s*in|email|remember\s*me|keep\s*me\s*logged\s*in)$/i;

/** Strip SEQTA product labels from `document.title`. */
export function parseSchoolNameFromTitle(title: string): string | null {
  const cleaned = title.replace(TITLE_NOISE, " ").replace(/\s+/g, " ").trim();
  if (!cleaned || /^seqta\b/i.test(cleaned)) return null;
  return cleaned;
}

function isUsableSchoolName(value: string | null | undefined): value is string {
  if (!value) return false;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length < 2) return false;
  if (/^seqta\b/i.test(trimmed)) return false;
  if (FIELD_LABELS.test(trimmed)) return false;
  return true;
}

/** Read the school name from SEQTA's native login shell. */
export function extractSchoolLoginName(
  root: ParentNode | null = document.querySelector(".login"),
): string | null {
  if (root instanceof Element) {
    const selectors = [
      "[data-site-name]",
      ".site-name",
      ".siteName",
      ".school-name",
      ".school",
      ".login-title",
      ".title",
      "h1",
      "h2",
      ".header",
    ];

    for (const selector of selectors) {
      for (const element of root.querySelectorAll(selector)) {
        const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
        if (isUsableSchoolName(text)) return text;
      }
    }
  }

  return parseSchoolNameFromTitle(document.title);
}

function parseSchoolNameFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  for (const key of ["site.name", "siteName", "schoolName"]) {
    const value = record[key];
    if (typeof value === "string" && isUsableSchoolName(value)) return value;
  }
  return null;
}

export async function fetchSchoolNameFromLoginApi(
  fetchImpl: typeof fetch = fetch,
  origin: string = location.origin,
): Promise<string | null> {
  try {
    const endpoint = seqtaLoginEndpoint(resolveSeqtaLoginRole());
    const response = await fetchImpl(`${origin}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      credentials: "include",
      body: JSON.stringify({
        mode: "normal",
        query: null,
        redirect_url: origin,
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { payload?: unknown };
    return parseSchoolNameFromPayload(data.payload);
  } catch {
    return null;
  }
}

export async function resolveSchoolLoginName(
  options: { timeoutMs?: number } = {},
): Promise<string | null> {
  const timeoutMs = options.timeoutMs ?? 4000;
  const immediate = extractSchoolLoginName();
  if (immediate) return immediate;

  const login = document.querySelector(".login");
  if (!login) return parseSchoolNameFromTitle(document.title);

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(timer);
      resolve(value);
    };

    const check = () => {
      const next = extractSchoolLoginName(login);
      if (next) finish(next);
    };

    const observer = new MutationObserver(check);
    observer.observe(login, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });

    const timer = window.setTimeout(async () => {
      const fromDom = extractSchoolLoginName(login);
      if (fromDom) {
        finish(fromDom);
        return;
      }
      finish(await fetchSchoolNameFromLoginApi());
    }, timeoutMs);
    check();
  });
}
