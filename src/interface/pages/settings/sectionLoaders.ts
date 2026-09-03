import type { Component } from "svelte";
import type { SettingsSectionId } from "./shared";

export const SECTION_LOADERS: Record<
  SettingsSectionId,
  () => Promise<{ default: Component }>
> = {
  account: () => import("./sections/account.svelte"),
  general: () => import("./sections/generalOptions.svelte"),
  appearance: () => import("./sections/appearance.svelte"),
  timetable: () => import("./sections/plugins.svelte"),
  assessments: () => import("./sections/plugins.svelte"),
  features: () => import("./sections/plugins.svelte"),
  advanced: () => import("./sections/advanced.svelte"),
};
