import type { Job, IndexItem } from "../types";

/* ------------- Notification types ------------- */
interface MessageNotification {
  notificationID: number;
  type: "message";
  message: { subtitle: string; messageID: number; title: string };
  timestamp: string;
}

interface AssessmentNotification {
  notificationID: number;
  type: "coneqtassessments";
  coneqtAssessments: {
    programmeID: number;
    metaclassID: number;
    subtitle: string;
    term: string;
    title: string;
    assessmentID: number;
    subjectCode: string;
  };
  timestamp: string;
}

type Notification = MessageNotification | AssessmentNotification;

/* ------------- Progress model ------------- */
interface AssessmentsProgress {
  lastTs: number; // ms since epoch of last processed notification
}

/* ------------- Helpers ------------- */
const fetchNotifications = async () => {
  const res = await fetch(`${location.origin}/seqta/student/heartbeat?`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      timestamp: "1970-01-01 00:00:00.0",
      hash: "#?page=/notifications",
    }),
  });
  const json = await res.json();
  return (json.notifications ?? []) as Notification[];
};

/* ------------- Job ------------- */
export const assessmentsJob: Job = {
  id: "assessments",
  label: "Assessments",
  renderComponentId: "assessment",
  frequency: { type: "expiry", afterMs: 15 * 60 * 1000 },

  run: async (ctx) => {
    const progress =
      (await ctx.getProgress<AssessmentsProgress>()) ?? { lastTs: 0 };
  
    let notifications: Notification[];
    try {
      notifications = await fetchNotifications();
    } catch (e) {
      console.error("[Assessments job] fetch failed:", e);
      return [];
    }
  
    const notificationIsIndexed = async (id: string): Promise<boolean> => {
      const [inAssessments, inMessages] = await Promise.all([
        ctx.getStoredItems("assessments").then((items) => items.some((i) => i.id === id)),
        ctx.getStoredItems("messages").then((items) => items.some((i) => i.id === id)),
      ]);
      return inAssessments || inMessages;
    };
  
    const items: IndexItem[] = [];
  
    for (const notif of notifications) {
      const id = notif.notificationID.toString();
      if (await notificationIsIndexed(id)) continue;
  
      if (notif.type === "coneqtassessments") {
        const a = notif.coneqtAssessments;
        items.push({
          id,
          text: a.title,
          category: "assessments",
          content: a.subtitle,
          dateAdded: new Date(notif.timestamp).getTime(),
          metadata: {
            assessmentId: a.assessmentID,
            subject: a.subjectCode,
            term: a.term,
            programmeId: a.programmeID,
            metaclassId: a.metaclassID,
            timestamp: notif.timestamp,
          },
          actionId: "assessment",
          renderComponentId: "assessment",
        });
      } else {
        await ctx.addItem(
          {
            id,
            text: notif.message.title,
            category: "messages",
            content: `From: ${notif.message.subtitle}`,
            dateAdded: new Date(notif.timestamp).getTime(),
            metadata: {
              messageId: notif.message.messageID,
              author: notif.message.subtitle,
              timestamp: notif.timestamp,
              isAssessmentNotification: true,
            },
            actionId: "message",
            renderComponentId: "message",
          },
          "messages"
        );
      }
    }
  
    if (items.length) {
      const latest = Math.max(
        ...items.map((i) => i.dateAdded),
        progress.lastTs,
      );
      await ctx.setProgress({ lastTs: latest });
    }
      
    return items;
  },

  purge: (items) => {
    const date = new Date();
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
    return items.filter((i) => i.dateAdded >= date.getTime());
  },
};