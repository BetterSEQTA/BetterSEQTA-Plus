// Import necessary types for the job and index item
import type { Job, IndexItem } from "../types";

// Function to fetch forum data from the server
const fetchForums = async () => {
  // Make a POST request to fetch the forums data
  const res = await fetch(`${location.origin}/seqta/student/load/forums`, {
    method: "POST", // HTTP method
    credentials: "include", // Include cookies with the request
    headers: { "Content-Type": "application/json; charset=utf-8" }, // Set request headers
    body: JSON.stringify({ mode: "list" }), // Send the request body with the mode parameter
  });

  // Return the response as JSON containing forum data
  return res.json() as Promise<{
    payload: { forums: any[] }; // The forums data
    status: string; // Status of the request
  }>;
};

// Define the forums job
export const forumsJob: Job = {
  id: "forums", // Unique job identifier
  label: "Forums", // Label for the job
  renderComponentId: "forum", // Component ID used for rendering
  frequency: { type: "expiry", afterMs: 30 * 24 * 60 * 60 * 1000 }, // Job runs every 30 days

  // Function to run the job and fetch forum data
  run: async (ctx) => {
    // Get the existing forum IDs from the stored items
    const existingIds = new Set(
      (await ctx.getStoredItems("forums")).map((i) => i.id),
    );

    let list;
    try {
      // Fetch the forum list from the server
      list = await fetchForums();
    } catch (e) {
      // Log error if fetching the list fails
      console.error("[Forums job] list fetch failed:", e);
      return [];
    }

    // If the status is not '200', return an empty array
    if (list.status !== "200") return [];

    const items: IndexItem[] = []; // Initialize an array to store new forum items

    // Loop through the forums and add new ones to the items array
    for (const forum of list.payload.forums) {
      const id = forum.id.toString(); // Convert the forum ID to a string
      if (existingIds.has(id)) continue; // Skip if the forum ID already exists

      // Add the new forum item to the items array
      items.push({
        id, // Forum ID
        text: forum.title, // Forum title
        category: "forums", // Category for the item
        content: `${forum.title}`, // Content to display
        dateAdded: Date.now(), // Date the item was added
        metadata: {
          forumId: forum.id, // Forum ID
          owner: forum.owner, // Forum owner
          title: forum.title, // Forum title
        },
        actionId: "forum", // Action identifier
        renderComponentId: "forum", // Render component identifier
      });
    }

    // Return the list of new forum items
    return items;
  },

  /** Keep only forums from the last 2 years. */
  // Function to purge old forums (older than 2 years)
  purge: (items) => {
    const twoYearsAgo = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000; // Calculate the timestamp for 2 years ago
    return items.filter((i) => i.dateAdded >= twoYearsAgo); // Filter out items older than 2 years
  },
};
