import type { Job } from "./types";
import { messagesJob } from "./jobs/messages";
import { notificationsJob } from "./jobs/notifications";
import { forumsJob } from "./jobs/forums";
import { subjectsJob } from "./jobs/subjects";

export const jobs: Record<string, Job> = {
  messages: messagesJob,
  notifications: notificationsJob,
  forums: forumsJob,
  subjects: subjectsJob,
};
