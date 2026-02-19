<script lang="ts">
  import Switch from "@/interface/components/Switch.svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";

  const WIDGET_KEYS = [
    { key: "shortcuts", label: "Shortcuts" },
    { key: "timetable", label: "Timetable" },
    { key: "upcomingAssessments", label: "Upcoming Assessments to Mark" },
    { key: "messages", label: "Direqt Messages" },
    { key: "notices", label: "Notices" },
  ] as const;

  const DEFAULT_WIDGETS: Record<string, { toggle: boolean }> = {
    shortcuts: { toggle: true },
    timetable: { toggle: true },
    upcomingAssessments: { toggle: true },
    messages: { toggle: true },
    notices: { toggle: true },
  };

  function getWidgets() {
    return $settingsState.teachHomeWidgets ?? DEFAULT_WIDGETS;
  }

  function toggleWidget(key: string) {
    const current = getWidgets();
    const currentToggle = current[key]?.toggle ?? true;
    settingsState.teachHomeWidgets = {
      ...current,
      [key]: { toggle: !currentToggle },
    };
  }
</script>

<div class="flex flex-col gap-2 p-2">
  <p class="text-xs text-zinc-500 dark:text-zinc-400 px-2 mb-2">
    Choose which widgets to show on the BetterSEQTA+ home page.
  </p>
  {#each WIDGET_KEYS as { key, label } (key)}
    <div class="flex justify-between items-center px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
      <span class="text-sm font-medium">{label}</span>
      <Switch
        state={getWidgets()[key]?.toggle ?? true}
        onChange={() => toggleWidget(key)}
      />
    </div>
  {/each}
</div>
