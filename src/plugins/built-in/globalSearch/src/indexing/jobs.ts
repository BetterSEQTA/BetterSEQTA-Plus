import type { Job } from "./types";
import type { IndexItem } from "./types";

interface MessageNotification {
  notificationID: number;
  type: "message";
  message: {
    subtitle: string;
    messageID: number;
    title: string;
  };
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

interface MessageListResponse {
  payload: {
    hasMore: boolean;
    messages: {
      date: string;
      attachments: boolean;
      attachmentCount: number;
      read: number;
      sender: string;
      sender_id: number;
      sender_type: string;
      subject: string;
      id: number;
      participants: Array<{
        name: string;
        photo: string;
        type: string;
      }>;
    }[];
    ts: string;
  };
  status: string;
}

interface MessageContentResponse {
  payload: {
    date: string;
    blind: boolean;
    read: boolean;
    subject: string;
    sender_type: string;
    sender_id: number;
    starred: boolean;
    contents: string;
    sender: string;
    files: any[];
    id: number;
    participants: Array<{
      read: number;
      name: string;
      photo: string;
      id: number;
      type: string;
    }>;
  };
  status: string;
}

// Helper to strip HTML tags from text
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

// Helper to fetch messages with pagination
async function fetchMessages(
  offset: number = 0,
  limit: number = 100,
): Promise<MessageListResponse> {
  const response = await fetch(
    `${location.origin}/seqta/student/load/message`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        searchValue: "",
        sortBy: "date",
        sortOrder: "desc",
        action: "list",
        label: "inbox",
        offset,
        limit,
        datetimeUntil: null,
      }),
    },
  );

  return await response.json();
}

// Helper to fetch message content
async function fetchMessageContent(
  messageId: number,
): Promise<MessageContentResponse> {
  const response = await fetch(
    `${location.origin}/seqta/student/load/message`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        action: "message",
        id: messageId,
      }),
    },
  );

  return await response.json();
}

// Helper to fetch notifications
async function fetchNotifications(): Promise<Notification[]> {
  const response = await fetch(`${location.origin}/seqta/student/heartbeat?`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      timestamp: "1970-01-01 00:00:00.0",
      hash: "#?page=/notifications",
    }),
  });

  const json = await response.json();
  return json.notifications ?? [];
}

export const jobs: Record<string, Job> = {
  messages: {
    id: "messages",
    label: "Messages",
    renderComponentId: "message",
    frequency: { type: "expiry", afterMs: 1000 * 60 * 5 }, // every 5 minutes

    run: async (ctx) => {
      // Get existing items first
      const existing = await ctx.getStoredItems();
      const existingIds = new Set(existing.map((i) => i.id));
      const newItems: IndexItem[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;
      let consecutiveExisting = 0;

      // Fetch all messages with pagination
      while (hasMore) {
        try {
          const response = await fetchMessages(offset, limit);

          if (response.status !== "200") {
            console.error("Failed to fetch messages:", response);
            break;
          }

          const messages = response.payload.messages;
          hasMore = response.payload.hasMore;

          // Process each message
          for (const message of messages) {
            const id = message.id.toString();

            // Skip if we already have this message
            if (existingIds.has(id)) {
              consecutiveExisting++;
              // If we've found 20 consecutive existing messages, assume we've caught up
              if (consecutiveExisting >= 20) {
                console.debug(
                  "[Messages Job] Found 20 consecutive existing messages, stopping fetch",
                );
                hasMore = false;
                break;
              }
              continue;
            }

            // Reset consecutive counter when we find a new message
            consecutiveExisting = 0;

            try {
              // Fetch message content
              const contentResponse = await fetchMessageContent(message.id);

              if (contentResponse.status !== "200") {
                console.error(
                  "Failed to fetch message content:",
                  contentResponse,
                );
                continue;
              }

              const content = stripHtmlTags(contentResponse.payload.contents);

              newItems.push({
                id,
                text: message.subject,
                category: "messages",
                content: `From: ${message.sender}\n\n${content}`,
                dateAdded: new Date(message.date).getTime(),
                metadata: {
                  messageId: message.id,
                  author: message.sender,
                  senderId: message.sender_id,
                  senderType: message.sender_type,
                  timestamp: message.date,
                  hasAttachments: message.attachments,
                  attachmentCount: message.attachmentCount,
                  read: message.read === 1,
                },
                actionId: "message",
                renderComponentId: "message",
              });

              // Add to existingIds as we process to prevent duplicates in the same run
              existingIds.add(id);
            } catch (error) {
              console.error("Error fetching message content:", error);
              continue;
            }
          }

          offset += limit;
        } catch (error) {
          console.error("Error fetching messages:", error);
          break;
        }

        // Small delay to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.debug(`[Messages Job] Found ${newItems.length} new messages`);
      return newItems;
    },

    purge: (items) => {
      // Keep messages from the last 30 days
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return items.filter((i) => i.dateAdded >= cutoff);
    },
  },

  assessments: {
    id: "assessments",
    label: "Assessments",
    renderComponentId: "assessment",
    frequency: { type: "expiry", afterMs: 1000 * 60 * 15 }, // every 15 minutes

    run: async (ctx) => {
      const notifications = await fetchNotifications();
      const assessmentNotifications = notifications.filter(
        (n): n is MessageNotification | AssessmentNotification =>
          n.type === "coneqtassessments" ||
          (n.type === "message" &&
            n.message.title.toLowerCase().includes("assessment")),
      );

      const existing = await ctx.getStoredItems();
      const existingIds = new Set(existing.map((i) => i.id));
      const newItems: IndexItem[] = [];

      for (const notification of assessmentNotifications) {
        const id = notification.notificationID.toString();
        if (existingIds.has(id)) continue;

        if (notification.type === "coneqtassessments") {
          const { coneqtAssessments: assessment } = notification;
          newItems.push({
            id,
            text: assessment.title,
            category: "assessments",
            content: assessment.subtitle,
            dateAdded: new Date(notification.timestamp).getTime(),
            metadata: {
              assessmentId: assessment.assessmentID,
              subject: assessment.subjectCode,
              term: assessment.term,
              programmeId: assessment.programmeID,
              metaclassId: assessment.metaclassID,
              timestamp: notification.timestamp,
            },
            actionId: "assessment",
            renderComponentId: "assessment",
          });
        } else {
          // Handle message-based assessments
          const { message } = notification;
          newItems.push({
            id,
            text: message.title,
            category: "assessments",
            content: `From: ${message.subtitle}`,
            dateAdded: new Date(notification.timestamp).getTime(),
            metadata: {
              messageId: message.messageID,
              author: message.subtitle,
              timestamp: notification.timestamp,
              isMessageBased: true,
            },
            actionId: "assessment",
            renderComponentId: "assessment",
          });
        }
      }

      return newItems;
    },

    purge: (items) => {
      // Keep assessments from the current year
      const date = new Date();
      date.setMonth(0); // January
      date.setDate(1);
      date.setHours(0);
      date.setMinutes(0);
      date.setSeconds(0);
      const cutoff = date.getTime();
      return items.filter((i) => i.dateAdded >= cutoff);
    },
  },

  // We can add more job types here as needed:
  // - notices
  // - timetable changes
  // - homework
  // etc.
};
