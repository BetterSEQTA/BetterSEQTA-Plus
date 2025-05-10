import type { Job } from "./types"; // Import the Job type definition from the local "types" module
import { messagesJob } from "./jobs/messages"; // Import the messagesJob implementation
import { notificationsJob } from "./jobs/notifications"; // Import the notificationsJob implementation
import { forumsJob } from "./jobs/forums"; // Import the forumsJob implementation

// Define a mapping of job names to their corresponding job implementations
export const jobs: Record<string, Job> = {
  messages: messagesJob,           // Job responsible for handling message-related tasks
  notifications: notificationsJob, // Job responsible for handling notification-related tasks
  forums: forumsJob,               // Job responsible for handling forum-related tasks
};
