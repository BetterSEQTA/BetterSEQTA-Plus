import { getEngageAssessmentStudentId } from "@/seqta/utils/engageAssessmentStudent";

function randomEngagePdfFileName(): string {
  const token = Math.random().toString(36).slice(2, 10);
  return `${token}.pdf`;
}

export async function requestEngageAssessmentPdf(params: {
  assessmentID: string | number;
  metaclassID: string | number;
  studentID: string | number;
}): Promise<string> {
  const fileName = randomEngagePdfFileName();
  const cacheBuster = Math.random().toString(36).slice(2, 10);

  const response = await fetch(
    `${location.origin}/seqta/parent/print/assessment?${cacheBuster}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      credentials: "include",
      body: JSON.stringify({
        id: params.assessmentID,
        metaclass: params.metaclassID,
        student: Number(params.studentID),
        fileName,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to generate PDF: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    payload?: { file?: string };
  };

  return data.payload?.file ?? fileName;
}

export function getEngageAssessmentReportUrl(fileName: string): string {
  return `${location.origin}/seqta/parent/report/get?file=${encodeURIComponent(fileName)}`;
}
