// Import necessary types and utility functions
import type { Job, IndexItem } from "../types";
import { htmlToPlainText } from "../utils";

// Function to fetch the list of messages with optional offset and limit
const fetchMessages = async (offset = 0, limit = 100) => {
  // Send a POST request to fetch messages
  const res = await fetch(`${location.origin}/seqta/student/load/message`, {
    method: "POST", // HTTP method
    credentials: "include", // Include cookies with the request
    headers: { "Content-Type": "application/json; charset=utf-8" }, // Set request headers
    body: JSON.stringify({
      searchValue: "", // No specific search value
      sortBy: "date", // Sort messages by date
      sortOrder: "desc", // Sort in descending order
      action: "list", // Action type for fetching the list
      label: "inbox", // Fetch messages from the inbox
      offset, // Pagination offset
      limit, // Pagination limit
      datetimeUntil: null, // No specific date filter
    }),
  });

  // Return the response as JSON containing message data
  return res.json() as Promise<{
    payload: { hasMore: boolean; messages: any[]; ts: string }; // Message data and status
    status: string; // Status of the request
  }>;
};

// Function to fetch the content of a single message by its ID
export const fetchMessageContent = async (id: number) => {
  // Send a POST request to fetch message content by ID
  const res = await fetch(`${location.origin}/seqta/student/load/message`, {
    method: "POST", // HTTP method
    credentials: "include", // Include cookies with the request
    headers: { "Content-Type": "application/json; charset=utf-8" }, // Set request headers
    body: JSON.stringify({ action: "message", id }), // Request body with the message ID
  });

  // Return the response as JSON containing message content
  return res.json() as Promise<{
    payload: { contents: string }; // Message contents
    status: string; // Status of the request
  }>;
};

// Define the interface for tracking the progress of the messages job
interface MessagesProgress {
  offset: number; // Pagination offset
  done: boolean; // Flag to indicate if the job is complete
}

// Define the messages job
export const messagesJob: Job = {
  id: "messages", // Unique job identifier
  label: "Messages", // Label for the job
  renderComponentId: "message", // Component ID used for rendering
  frequency: { type: "expiry", afterMs: 1000 * 60 * 60 * 24 }, // Job runs every 24 hours

  // Function to run the job and fetch messages
  run: async (ctx) => {
    const limit = 100; // Set pagination limit
    const progress = (await ctx.getProgress<MessagesProgress>()) ?? {
      offset: 0, // Initialize offset if not found
      done: false, // Initialize done flag
    };

    // Get the existing message IDs from stored items
    const existingIds = new Set((await ctx.getStoredItems()).map((i) => i.id));

    let consecutiveExisting = 0; // Counter for consecutive existing messages

    // Continue fetching messages until the job is marked as done
    while (!progress.done) {
      let list;
      try {
        // Fetch the messages list
        list = await fetchMessages(progress.offset, limit);
      } catch (e) {
        // Log error if fetching the list fails
        console.error("[Messages job] list fetch failed:", e);
        break;
      }

      // If the status is not '200', break the loop
      if (list.status !== "200") break;

      // Loop through the fetched messages
      for (const msg of list.payload.messages) {
        const id = msg.id.toString(); // Convert the message ID to a string

        // Skip if the message ID already exists
        if (existingIds.has(id)) {
          consecutiveExisting += 1;
          if (consecutiveExisting >= 20) {
            // Mark job as done if 20 consecutive existing messages are found
            progress.done = true;
            break;
          }
          continue;
        }
        consecutiveExisting = 0;

        let full;
        try {
          // Fetch the full content of the message
          full = await fetchMessageContent(msg.id);
        } catch (e) {
          // Log error if fetching message content fails
          console.error(`[Messages job] content fetch failed (id ${id}):`, e);
          continue;
        }
        if (full.status !== "200") continue;

        // Create a new index item for the message
        const item: IndexItem = {
          id, // Message ID
          text: msg.subject, // Message subject
          category: "messages", // Category for the item
          content: `${htmlToPlainText(full.payload.contents)}\nFrom: ${msg.sender}`, // Message content and sender
          dateAdded: new Date(msg.date).getTime(), // Date the message was added
          metadata: {
            messageId: msg.id, // Message ID
            author: msg.sender, // Message sender
            senderId: msg.sender_id, // Sender's ID
            senderType: msg.sender_type, // Sender's type
            timestamp: msg.date, // Timestamp of the message
            hasAttachments: msg.attachments, // Whether the message has attachments
            attachmentCount: msg.attachmentCount, // Number of attachments
            read: msg.read === 1, // Read status of the message
          },
          actionId: "message", // Action identifier
          renderComponentId: "message", // Render component identifier
        };

        // Add the new item to the context
        await ctx.addItem(item);
        existingIds.add(id); // Add the message ID to the existing IDs set
      }

      // If no more messages, mark the job as done
      if (!list.payload.hasMore) progress.done = true;

      // Update the pagination offset
      progress.offset += limit;
      await ctx.setProgress(progress); // Save the progress
    }

    // Reset progress once the job is done
    if (progress.done) await ctx.setProgress({ offset: 0, done: false });

    return []; // Return empty array after completion
  },

  /** Keep only messages from the last 4 years. */
  // Function to purge old messages (older than 4 years)
  purge: (items) => {
    const fourYears = Date.now() - 4 * 365 * 24 * 60 * 60 * 1000; // Calculate the timestamp for 4 years ago
    return items.filter((i) => i.dateAdded >= fourYears); // Filter out items older than 4 years
  },
};
