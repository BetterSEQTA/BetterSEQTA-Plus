import type { Job, IndexItem } from "../types";
import { htmlToPlainText } from "../utils";
import { fetchMessageContent } from "./messages";
import { delay } from "@/seqta/utils/delay";
import { VectorWorkerManager } from "../worker/vectorWorkerManager";
import { loadDynamicItems } from "../../utils/dynamicItems";
import { loadAllStoredItems } from "../indexer";
import { renderComponentMap } from "../renderComponents";
import { jobs } from "../jobs";

const NOTIFICATIONS_RATE_LIMIT = {
  baseDelay: 150,
  maxDelay: 3000,
  backoffMultiplier: 1.4,
  maxRetries: 2,
  batchDelay: 100,
  vectorBatchSize: 3,
};

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

interface NotificationsProgress {
  lastTs: number;
  failedRequests: number;
  currentDelay: number;
  retryQueue: number[];
  streamingStarted: boolean;
}

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

const fetchAssessmentName = async (
  assessmentId: number,
  metaclassId: number,
  programmeId: number,
  retryCount = 0,
): Promise<string> => {
  const searchAssessment = (data: any): string | null => {
    for (const item of data.syllabus || []) {
      const found = (item.assessments || []).find(
        (a: any) => a.id === assessmentId,
      );
      if (found) return found.title;
    }

    const foundPending = (data.pending || []).find(
      (a: any) => a.id === assessmentId,
    );
    if (foundPending) return foundPending.title;

    const foundTask = (data.tasks || []).find(
      (a: any) => a.id === assessmentId,
    );
    if (foundTask) return foundTask.title;

    return null;
  };

  const fetchAssessments = async (endpoint: string) => {
    try {
      const res = await fetch(`${location.origin}${endpoint}`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          metaclass: metaclassId,
          programme: programmeId,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      return json.payload;
    } catch (error) {
      console.warn(
        `[Notifications job] Failed to fetch assessments from ${endpoint} (attempt ${retryCount + 1}):`,
        error,
      );

      if (retryCount < NOTIFICATIONS_RATE_LIMIT.maxRetries) {
        const retryDelay =
          NOTIFICATIONS_RATE_LIMIT.baseDelay *
          Math.pow(NOTIFICATIONS_RATE_LIMIT.backoffMultiplier, retryCount);
        await delay(Math.min(retryDelay, NOTIFICATIONS_RATE_LIMIT.maxDelay));
        return fetchAssessments(endpoint);
      }

      throw error;
    }
  };

  try {
    let payload = await fetchAssessments("/seqta/student/assessment/list/past");
    let title = searchAssessment(payload);
    if (title) return title;

    await delay(NOTIFICATIONS_RATE_LIMIT.baseDelay);

    const upcomingPayload = await fetchAssessments(
      "/seqta/student/assessment/list/upcoming",
    );
    const foundUpcoming = (upcomingPayload || []).find(
      (a: any) => a.id === assessmentId,
    );
    if (foundUpcoming) return foundUpcoming.title;

    throw new Error(
      `Assessment with ID ${assessmentId} not found in past or upcoming.`,
    );
  } catch (error) {
    if (retryCount < NOTIFICATIONS_RATE_LIMIT.maxRetries) {
      const retryDelay =
        NOTIFICATIONS_RATE_LIMIT.baseDelay *
        Math.pow(NOTIFICATIONS_RATE_LIMIT.backoffMultiplier, retryCount);
      await delay(Math.min(retryDelay, NOTIFICATIONS_RATE_LIMIT.maxDelay));
      return fetchAssessmentName(
        assessmentId,
        metaclassId,
        programmeId,
        retryCount + 1,
      );
    }

    console.error(
      `[Notifications job] Failed to fetch assessment name for ID ${assessmentId} after ${retryCount + 1} attempts:`,
      error,
    );
    return `Assessment ${assessmentId}`;
  }
};

export const notificationsJob: Job = {
  id: "notifications",
  label: "Notifications",
  renderComponentId: "notifications",
  frequency: { type: "expiry", afterMs: 15 * 60 * 1000 },

  run: async (ctx) => {
    const progress = (await ctx.getProgress<NotificationsProgress>()) ?? {
      lastTs: 0,
      failedRequests: 0,
      currentDelay: NOTIFICATIONS_RATE_LIMIT.baseDelay,
      retryQueue: [],
      streamingStarted: false,
    };

    let notifications: Notification[];
    try {
      notifications = await fetchNotifications();
    } catch (e) {
      console.error("[Notifications job] fetch failed:", e);
      progress.failedRequests++;
      progress.currentDelay = Math.min(
        progress.currentDelay * NOTIFICATIONS_RATE_LIMIT.backoffMultiplier,
        NOTIFICATIONS_RATE_LIMIT.maxDelay,
      );
      await ctx.setProgress(progress);
      return [];
    }

    const vectorWorker = VectorWorkerManager.getInstance();
    if (!progress.streamingStarted && notifications.length > 0) {
      const estimatedTotal = Math.min(notifications.length * 1.2, 100);

      try {
        await vectorWorker.startStreamingSession(
          estimatedTotal,
          (progressData) => {
            console.log(
              `[Notifications job] Vector streaming progress: ${progressData.processed}/${progressData.total} (${progressData.status})`,
            );
          },
          NOTIFICATIONS_RATE_LIMIT.vectorBatchSize,
          "notifications",
        );
        progress.streamingStarted = true;
        console.log(
          `[Notifications job] Started streaming vectorization session for ~${estimatedTotal} items`,
        );
      } catch (error) {
        console.warn(
          "[Notifications job] Failed to start streaming session:",
          error,
        );
      }
    }

    const notificationIsIndexed = async (id: string): Promise<boolean> => {
      try {
        const [inAssessments, inMessages] = await Promise.all([
          ctx
            .getStoredItems("notifications")
            .then((items) => items.some((i) => i.id === id)),
          ctx
            .getStoredItems("messages")
            .then((items) => items.some((i) => i.id === id)),
        ]);
        return inAssessments || inMessages;
      } catch (error) {
        console.warn(
          `[Notifications job] Error checking if notification ${id} is indexed:`,
          error,
        );
        return false;
      }
    };

    const items: IndexItem[] = [];
    const itemsToStream: IndexItem[] = [];
    let processedCount = 0;
    let progressUpdateCounter = 0;
    let itemsStreamedToVector = 0;

    if (progress.retryQueue.length > 0) {
      console.log(
        `[Notifications job] Processing ${Math.min(progress.retryQueue.length, 3)} items from retry queue`,
      );

      const retryBatch = progress.retryQueue.slice(0, 3);

      for (const notificationId of retryBatch) {
        const notification = notifications.find(
          (n) => n.notificationID === notificationId,
        );
        if (!notification) {
          progress.retryQueue = progress.retryQueue.filter(
            (id) => id !== notificationId,
          );
          continue;
        }

        await delay(progress.currentDelay);

        try {
          const { success, item } = await processNotification(
            notification,
            ctx,
          );
          if (success) {
            progress.retryQueue = progress.retryQueue.filter(
              (id) => id !== notificationId,
            );
            progress.failedRequests = Math.max(0, progress.failedRequests - 1);
            progress.currentDelay = Math.max(
              progress.currentDelay * 0.9,
              NOTIFICATIONS_RATE_LIMIT.baseDelay,
            );

            if (item) {
              items.push(item);
              itemsToStream.push(item);
            }
          }
        } catch (error) {
          console.error(
            `[Notifications job] Retry failed for notification ${notificationId}:`,
            error,
          );
          progress.failedRequests++;
        }
      }
    }

    const notificationsToProcess = notifications.slice(0, 20);

    for (const notif of notificationsToProcess) {
      const id = notif.notificationID.toString();

      try {
        if (await notificationIsIndexed(id)) continue;
        if (progress.retryQueue.includes(notif.notificationID)) continue;

        if (processedCount > 0) {
          await delay(NOTIFICATIONS_RATE_LIMIT.batchDelay);
        }

        const { success, item } = await processNotification(notif, ctx);
        if (!success) {
          if (progress.retryQueue.length < 10) {
            progress.retryQueue.push(notif.notificationID);
          }
          progress.failedRequests++;
        } else {
          progress.failedRequests = Math.max(0, progress.failedRequests - 1);
          progress.currentDelay = Math.max(
            progress.currentDelay * 0.95,
            NOTIFICATIONS_RATE_LIMIT.baseDelay,
          );

          if (item) {
            items.push(item);
            itemsToStream.push(item);
          }
        }
      } catch (error) {
        console.error(
          `[Notifications job] Failed to process notification ${id}:`,
          error,
        );

        if (progress.retryQueue.length < 10) {
          progress.retryQueue.push(notif.notificationID);
        }
        progress.failedRequests++;
        progress.currentDelay = Math.min(
          progress.currentDelay * NOTIFICATIONS_RATE_LIMIT.backoffMultiplier,
          NOTIFICATIONS_RATE_LIMIT.maxDelay,
        );
      }

      processedCount++;

      if (
        itemsToStream.length >= NOTIFICATIONS_RATE_LIMIT.vectorBatchSize &&
        progress.streamingStarted
      ) {
        try {
          await vectorWorker.streamItems([...itemsToStream]);
          itemsStreamedToVector += itemsToStream.length;
          console.log(
            `[Notifications job] Streamed ${itemsToStream.length} items to vector worker (total: ${itemsStreamedToVector})`,
          );
          itemsToStream.length = 0;
        } catch (error) {
          console.warn(
            "[Notifications job] Failed to stream items to vector worker:",
            error,
          );
        }
      }

      progressUpdateCounter++;
      if (progressUpdateCounter >= 5) {
        await ctx.setProgress(progress);
        progressUpdateCounter = 0;

        if (items.length > 0) {
          try {
            const currentItems = await loadAllStoredItems();
            currentItems.forEach((item) => {
              const jobDef =
                jobs[item.category] ||
                Object.values(jobs).find((j) => j.id === item.category) ||
                jobs[item.renderComponentId];
              if (jobDef) {
                const renderComponent =
                  renderComponentMap[jobDef.renderComponentId];
                if (renderComponent) {
                  item.renderComponent = renderComponent;
                }
              } else if (renderComponentMap[item.renderComponentId]) {
                item.renderComponent =
                  renderComponentMap[item.renderComponentId];
              }
            });
            loadDynamicItems(currentItems);
            window.dispatchEvent(
              new CustomEvent("dynamic-items-updated", {
                detail: {
                  incremental: true,
                  jobId: "notifications",
                  newItemCount: items.length,
                  streaming: true,
                },
              }),
            );
          } catch (error) {
            console.warn(
              "[Notifications job] Failed to dispatch incremental search update:",
              error,
            );
          }
        }
      }
    }

    if (itemsToStream.length > 0 && progress.streamingStarted) {
      try {
        await vectorWorker.streamItems([...itemsToStream]);
        itemsStreamedToVector += itemsToStream.length;
        console.log(
          `[Notifications job] Streamed final ${itemsToStream.length} items to vector worker (total: ${itemsStreamedToVector})`,
        );
      } catch (error) {
        console.warn(
          "[Notifications job] Failed to stream final items to vector worker:",
          error,
        );
      }
    }

    if (progress.streamingStarted) {
      try {
        await vectorWorker.endStreamingSession();
        console.log(
          `[Notifications job] Ended streaming session. Total items streamed: ${itemsStreamedToVector}`,
        );
        progress.streamingStarted = false;
      } catch (error) {
        console.warn(
          "[Notifications job] Failed to end streaming session:",
          error,
        );
      }
    }

    if (items.length) {
      const latest = Math.max(
        ...items.map((i) => i.dateAdded),
        progress.lastTs,
      );
      progress.lastTs = latest;
    }

    await ctx.setProgress(progress);
    console.log(
      `[Notifications job] Processed ${processedCount} notifications, ${progress.retryQueue.length} in retry queue, ${progress.failedRequests} failures, ${itemsStreamedToVector} items streamed to vector worker`,
    );

    return items;
  },

  purge: (items) => {
    const date = new Date();
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
    return items.filter((i) => i.dateAdded >= date.getTime());
  },
};

async function processNotification(
  notif: Notification,
  ctx: any,
): Promise<{ success: boolean; item?: IndexItem }> {
  const id = notif.notificationID.toString();

  try {
    if (notif.type === "coneqtassessments") {
      const a = notif.coneqtAssessments;

      const content = await fetchAssessmentName(
        a.assessmentID,
        a.metaclassID,
        a.programmeID,
      );

      const item: IndexItem = {
        id,
        text: a.title,
        category: "assessments",
        content: content,
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
      };

      return { success: true, item };
    } else if (notif.type === "message") {
      const content = await fetchMessageContent(notif.message.messageID);

      if (content && content.payload) {
        const item: IndexItem = {
          id,
          text: notif.message.title,
          category: "messages",
          content: `${htmlToPlainText(content.payload.contents)}\nFrom: ${notif.message.subtitle}`,
          dateAdded: new Date(notif.timestamp).getTime(),
          metadata: {
            messageId: notif.message.messageID,
            author: notif.message.subtitle,
            timestamp: notif.timestamp,
            isAssessmentNotification: true,
          },
          actionId: "message",
          renderComponentId: "message",
        };

        await ctx.addItem(item, "messages");
        return { success: true, item };
      }
    }

    return { success: false };
  } catch (error) {
    console.error(
      `[Notifications job] Error processing notification ${id}:`,
      error,
    );
    return { success: false };
  }
}
