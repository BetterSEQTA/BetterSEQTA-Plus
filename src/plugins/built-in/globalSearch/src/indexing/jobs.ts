import type { Job } from "./types";
import { messagesJob } from "./jobs/messages";
import { assessmentsJob } from "./jobs/assessments";

export const jobs: Record<string, Job> = {
  messages: messagesJob,
  assessments: assessmentsJob,
};
