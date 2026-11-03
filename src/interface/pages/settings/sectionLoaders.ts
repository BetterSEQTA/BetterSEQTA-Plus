import type { MountableSvelteComponent } from "@/types/mountableComponent";
import type { SettingsSectionId } from "./shared";

export const SECTION_LOADERS: Record<
  SettingsSectionId,
  () => Promise<{ default: MountableSvelteComponent }>
> = {
  account: () =>
    import("./sections/account.svelte") as Promise<{ default: MountableSvelteComponent }>,
  general: () =>
    import("./sections/generalOptions.svelte") as Promise<{ default: MountableSvelteComponent }>,
  appearance: () =>
    import("./sections/appearance.svelte") as Promise<{ default: MountableSvelteComponent }>,
  timetable: () =>
    import("./sections/plugins.svelte") as Promise<{ default: MountableSvelteComponent }>,
  assessments: () =>
    import("./sections/plugins.svelte") as Promise<{ default: MountableSvelteComponent }>,
  features: () =>
    import("./sections/plugins.svelte") as Promise<{ default: MountableSvelteComponent }>,
  advanced: () =>
    import("./sections/advanced.svelte") as Promise<{ default: MountableSvelteComponent }>,
};
