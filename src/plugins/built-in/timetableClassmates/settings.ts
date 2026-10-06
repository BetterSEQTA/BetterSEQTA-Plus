import { booleanSetting, componentSetting, defineSettings } from "@/plugins/core/settingsHelpers";
import TimetableClassmatesAvatarsSwitch from "./TimetableClassmatesAvatarsSwitch.svelte";
import TimetableClassmatesSharing from "./TimetableClassmatesSharing.svelte";

export const timetableClassmatesSettings = defineSettings({
  enabled: booleanSetting({
    default: false,
    title: "Enable timetable classmates",
    description: "Show opted-in classmates on your timetable via private sync",
  }),
  showAvatars: componentSetting({
    title: "Show classmate avatars",
    description: "Display avatar stacks on lessons (saved per SEQTA site and student on this device)",
    component: TimetableClassmatesAvatarsSwitch,
  }),
  sharing: componentSetting({
    title: "Classmate sharing",
    description:
      "Encrypted class enrollments sync through BetterSEQTA Cloud. Your full timetable is never stored on our servers.",
    component: TimetableClassmatesSharing,
  }),
});
