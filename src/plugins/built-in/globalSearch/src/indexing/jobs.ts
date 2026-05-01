import type { Job } from "./types";
import { messagesJob } from "./jobs/messages";
import { notificationsJob } from "./jobs/notifications";
import { forumsJob } from "./jobs/forums";
import { subjectsJob } from "./jobs/subjects";
import { assignmentsJob } from "./jobs/assignments";
import { coursesJob } from "./jobs/courses";
import { noticesJob } from "./jobs/notices";
import { documentsJob } from "./jobs/documents";
import { folioJob } from "./jobs/folio";
import { portalsJob } from "./jobs/portals";
import { reportsJob } from "./jobs/reports";
import { goalsJob } from "./jobs/goals";
import { passiveJob } from "./jobs/passive";

export const jobs: Record<string, Job> = {
  messages: messagesJob,
  notifications: notificationsJob,
  forums: forumsJob,
  subjects: subjectsJob,
  assignments: assignmentsJob,
  courses: coursesJob,
  notices: noticesJob,
  documents: documentsJob,
  folio: folioJob,
  portals: portalsJob,
  reports: reportsJob,
  goals: goalsJob,
  passive: passiveJob,
};
