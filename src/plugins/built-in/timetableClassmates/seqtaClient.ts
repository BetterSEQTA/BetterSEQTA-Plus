import { getStudentId, tryGetUserInfo } from "@/seqta/utils/userInfo";

export async function postSeqtaJson<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${location.origin}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Requested-With": "XMLHttpRequest",
      Accept: "text/javascript, text/html, application/xml, text/xml, */*",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`SEQTA request failed (${res.status})`);
  return (await res.json()) as T;
}

export async function resolvePersonUuid(): Promise<string | undefined> {
  const payload = await tryGetUserInfo();
  const uuid = payload?.personUUID;
  return typeof uuid === "string" && uuid.length > 0 ? uuid : undefined;
}

export type TimetableApiItem = {
  date?: string;
  from?: string;
  until?: string;
  description?: string;
  code?: string;
  metaID?: number;
  programmeID?: number;
  ci?: number;
  type?: string;
};

export async function fetchStudentTimetableItems(
  from: string,
  until: string,
): Promise<TimetableApiItem[]> {
  const studentId = await getStudentId();
  const body: Record<string, unknown> = { from, until };
  if (studentId != null) body.student = studentId;
  const data = await postSeqtaJson<{ payload?: { items?: TimetableApiItem[] } }>(
    "/seqta/student/load/timetable?",
    body,
  );
  return Array.isArray(data?.payload?.items) ? data.payload.items : [];
}
