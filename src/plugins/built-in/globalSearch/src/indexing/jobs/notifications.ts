// Import necessary types and utility functions
import type { Job, IndexItem } from "../types";
import { htmlToPlainText } from "../utils";
import { fetchMessageContent } from "./messages";

/* ------------- Notification types ------------- */
// Define types for different notification formats
interface MessageNotification {
  notificationID: number;
  type: "message"; // Type for message notifications
  message: { subtitle: string; messageID: number; title: string }; // Message details
  timestamp: string; // Timestamp of the notification
}

interface AssessmentNotification {
  notificationID: number;
  type: "coneqtassessments"; // Type for assessment notifications
  coneqtAssessments: {
    programmeID: number; // Program ID for the assessment
    metaclassID: number; // Metaclass ID for the assessment
    subtitle: string; // Subtitle for the assessment
    term: string; // Term for the assessment
    title: string; // Title of the assessment
    assessmentID: number; // Assessment ID
    subjectCode: string; // Subject code for the assessment
  };
  timestamp: string; // Timestamp of the notification
}

type Notification = MessageNotification | AssessmentNotification; // Union type for notifications

// Define the structure for progress tracking
interface NotificationsProgress {
  lastTs: number; // Timestamp of the last processed notification (in milliseconds)
}

/* ------------- Helpers ------------- */
// Function to fetch notifications from the server
const fetchNotifications = async () => {
  const res = await fetch(`${location.origin}/seqta/student/heartbeat?`, {
    method: "POST", // HTTP POST request
    headers: { "Content-Type": "application/json; charset=utf-8" }, // Set content type
    body: JSON.stringify({
      timestamp: "1970-01-01 00:00:00.0", // Request from the beginning of time
      hash: "#?page=/notifications", // Specific page for notifications
    }),
  });
  const json = await res.json();
  return (json.notifications ?? []) as Notification[]; // Return notifications if available
};

// Function to fetch the assessment name by its ID and other parameters
const fetchAssessmentName = async (
  assessmentId: number,
  metaclassId: number,
  programmeId: number,
): Promise<string> => {
  // Helper function to search for assessment in various data sources
  const searchAssessment = (data: any): string | null => {
    for (const item of data.syllabus || []) {
      const found = (item.assessments || []).find(
        (a: any) => a.id === assessmentId,
      );
      if (found) return found.title;
    }

    for (const item of data.pending || []) {
      const foundPending = (item.assessments || []).find(
        (a: any) => a.id === assessmentId,
      );
      if (foundPending) return foundPending.title;
    }

    for (const item of data.tasks || []) {
      const foundTask = (item.assessments || []).find(
        (a: any) => a.id === assessmentId,
      );
      if (foundTask) return foundTask.title;
    }

    return null;
  };

  // Function to fetch assessments from the specified endpoint
  const fetchAssessments = async (endpoint: string) => {
    const res = await fetch(`${location.origin}${endpoint}`, {
      method: "POST", // Send POST request
      credentials: "include", // Include cookies for the request
      body: JSON.stringify({
        metaclass: metaclassId, // Metaclass ID
        programme: programmeId, // Programme ID
      }),
    });
    const json = await res.json();
    return json.payload; // Return the payload with assessment data
  };

  // Attempt to fetch the assessment name from past assessments
  let payload = await fetchAssessments("/seqta/student/assessment/list/past");
  let title = searchAssessment(payload);
  if (title) return title; // Return if found in past assessments

  // Attempt to fetch the assessment name from upcoming assessments if not found in past
  const upcomingPayload = await fetchAssessments(
    "/seqta/student/assessment/list/upcoming",
  );
  const foundUpcoming = (upcomingPayload || []).find(
    (a: any) => a.id === assessmentId,
  );
  if (foundUpcoming) return foundUpcoming.title; // Return if found in upcoming assessments

  // Throw error if not found in either past or upcoming assessments
  throw new Error(
    `Assessment with ID ${assessmentId} not found in past or upcoming.`,
  );
};

/* ------------- Job ------------- */
export const notificationsJob: Job = {
  id: "notifications", // Unique identifier for the job
  label: "Notifications", // Label for the job
  renderComponentId: "notifications", // Component ID for rendering the notifications
  frequency: { type: "expiry", afterMs: 15 * 60 * 1000 }, // Job runs every 15 minutes

  // Function to run the job and fetch/process notifications
  run: async (ctx) => {
    const progress = (await ctx.getProgress<NotificationsProgress>()) ?? {
      lastTs: 0, // Initialize last timestamp if not found
    };

    let notifications: Notification[];
    try {
      notifications = await fetchNotifications(); // Fetch notifications
    } catch (e) {
      console.error("[Notifications job] fetch failed:", e); // Log error if fetch fails
      return [];
    }

    // Check if the notification is already indexed
    const notificationIsIndexed = async (id: string): Promise<boolean> => {
      const [inAssessments, inMessages] = await Promise.all([
        ctx
          .getStoredItems("notifications") // Check if notification is in assessments
          .then((items) => items.some((i) => i.id === id)),
        ctx
          .getStoredItems("messages") // Check if notification is in messages
          .then((items) => items.some((i) => i.id === id)),
      ]);
      return inAssessments || inMessages; // Return true if found in either
    };

    const items: IndexItem[] = []; // Array to hold indexed items

    // Loop through each notification
    for (const notif of notifications) {
      const id = notif.notificationID.toString(); // Convert notification ID to string
      if (await notificationIsIndexed(id)) continue; // Skip if already indexed

      if (notif.type === "coneqtassessments") {
        // Handle assessment notifications
        const a = notif.coneqtAssessments;

        const content = await fetchAssessmentName(
          a.assessmentID,
          a.metaclassID,
          a.programmeID,
        ); // Fetch the assessment name
        items.push({
          id, // Notification ID
          text: a.title, // Assessment title
          category: "assessments", // Category for the item
          content, // Content of the notification
          dateAdded: new Date(notif.timestamp).getTime(), // Date added from timestamp
          metadata: {
            assessmentId: a.assessmentID, // Additional metadata for the assessment
            subject: a.subjectCode,
            term: a.term,
            programmeId: a.programmeID,
            metaclassId: a.metaclassID,
            timestamp: notif.timestamp,
          },
          actionId: "assessment", // Action identifier for the item
          renderComponentId: "assessment", // Render component identifier
        });
      } else if (notif.type === "message") {
        // Handle message notifications
        const content = await fetchMessageContent(notif.message.messageID); // Fetch message content

        // Add the message item to the context
        await ctx.addItem(
          {
            id, // Notification ID
            text: notif.message.title, // Message title
            category: "messages", // Category for the item
            content: `${htmlToPlainText(content.payload.contents)}\nFrom: ${notif.message.subtitle}`, // Message content
            dateAdded: new Date(notif.timestamp).getTime(), // Date added from timestamp
            metadata: {
              messageId: notif.message.messageID, // Message ID
              author: notif.message.subtitle, // Author of the message
              timestamp: notif.timestamp, // Timestamp of the message
              isAssessmentNotification: true, // Mark as assessment notification
            },
            actionId: "message", // Action identifier for the item
            renderComponentId: "message", // Render component identifier
          },
          "messages", // Store the item under the "messages" category
        );
      }
    }

    // Update progress with the latest timestamp
    if (items.length) {
      const latest = Math.max(
        ...items.map((i) => i.dateAdded), // Get the latest date added
        progress.lastTs, // Compare with last processed timestamp
      );
      await ctx.setProgress({ lastTs: latest }); // Update the progress with the latest timestamp
    }

    return items; // Return the indexed items
  },

  // Function to purge old items
  purge: (items) => {
    const date = new Date();
    date.setMonth(0, 1); // Set date to the first day of the current year
    date.setHours(0, 0, 0, 0); // Set time to the start of the day
    return items.filter((i) => i.dateAdded >= date.getTime()); // Keep items from this year
  },
};
