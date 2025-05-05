import type { Job } from "./types";
import { messagesJob } from "./jobs/messages";
import { assessmentsJob } from "./jobs/assessments";
import { forumsJob } from "./jobs/forums";

export const jobs: Record<string, Job> = {
  messages: messagesJob,
  assessments: assessmentsJob,
  forums: forumsJob,
};
