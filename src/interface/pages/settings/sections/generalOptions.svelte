<script lang="ts">
  import Switch from "@/interface/components/Switch.svelte";
  import Button from "@/interface/components/Button.svelte";
  import Select from "@/interface/components/Select.svelte";
  import SettingRow from "../SettingRow.svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
  import {
    PERFORMANCE_HEAVY_PLUGINS,
    setPerformanceModePluginOverride,
  } from "@/seqta/utils/performanceMode";
  import browser from "webextension-polyfill";
  import { matchesSearch, type SettingsSectionSharedProps } from "../shared";

  let { searchQuery = "" }: SettingsSectionSharedProps = $props();

  const isEngage = isSeqtaEngageExperience();

  const generalOptions = $derived([
    {
      title: "Performance Mode",
      description:
        "Pauses heavy plugins, disables blur, and uses shorter smooth animations while SEQTA is open",
      id: 0,
      Component: Switch,
      props: {
        state: $settingsState.performanceMode ?? false,
        onChange: (isOn: boolean) => (settingsState.performanceMode = isOn),
      },
    },
    ...(!isEngage
      ? [
          {
            title: "Edit Sidebar Layout",
            description: "Reorder pages on the sidebar",
            id: 5,
            Component: Button,
            props: {
              onClick: () =>
                browser.runtime.sendMessage({ type: "currentTab", info: "EditSidebar" }),
              text: "Edit",
            },
          },
          {
            title: "Icon Only Sidebar",
            description: "Show only icons in the sidebar for a compact layout",
            id: 14,
            Component: Switch,
            props: {
              state: $settingsState.iconOnlySidebar ?? false,
              onChange: (isOn: boolean) => (settingsState.iconOnlySidebar = isOn),
            },
          },
        ]
      : []),
    {
      title: "Animations",
      description: "Enable animations on certain pages",
      id: 6,
      Component: Switch,
      props: {
        state: $settingsState.animations,
        onChange: (isOn: boolean) => (settingsState.animations = isOn),
      },
    },
    {
      title: "12 Hour Time",
      description: "Prefer 12 hour time format for SEQTA",
      id: 9,
      Component: Switch,
      props: {
        state: $settingsState.timeFormat === "12",
        onChange: (isOn: boolean) => (settingsState.timeFormat = isOn ? "12" : "24"),
      },
    },
    {
      title: "Default Page",
      description: "Choose which page loads first when you open SEQTA",
      id: 10,
      Component: Select,
      props: {
        value: $settingsState.defaultPage ?? "home",
        onChange: (value: string) => (settingsState.defaultPage = value),
        options: isEngage
          ? [
              { value: "home", label: "Home" },
              { value: "dashboard", label: "Dashboard" },
              { value: "timetable", label: "Timetable" },
              { value: "messages", label: "Messages" },
              { value: "documents", label: "Documents" },
              { value: "reports", label: "Reports" },
            ]
          : [
              { value: "home", label: "Home" },
              { value: "dashboard", label: "Dashboard" },
              { value: "timetable", label: "Timetable" },
              { value: "welcome", label: "Welcome" },
              { value: "messages", label: "Messages" },
              { value: "documents", label: "Documents" },
              { value: "reports", label: "Reports" },
            ],
      },
    },
    ...(!isEngage
      ? [
          {
            title: "News Feed Source",
            description: "Choose the sources for your news feed",
            id: 11,
            Component: Select,
            props: {
              value: $settingsState.newsSource,
              onChange: (value: string) => (settingsState.newsSource = value),
              options: [
                { value: "australia", label: "Australia" },
                { value: "usa", label: "USA" },
                { value: "uk", label: "UK" },
                { value: "taiwan", label: "Taiwan" },
                { value: "hong_kong", label: "Hong Kong" },
                { value: "panama", label: "Panama" },
                { value: "canada", label: "Canada" },
                { value: "singapore", label: "Singapore" },
                { value: "japan", label: "Japan" },
                { value: "netherlands", label: "Netherlands" },
              ],
            },
          },
        ]
      : []),
  ]);
</script>

{#each generalOptions as option (option.id)}
  <SettingRow {...option} {searchQuery} />
  {#if option.id === 0 && $settingsState.performanceMode && matchesSearch(searchQuery, "Performance Mode", "Global Search", "Assessment Averages", "enable anyway", "paused")}
    <div class="border-none -mt-px">
      <div
        class="mx-5 mb-4 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 dark:border-zinc-700/60 dark:bg-zinc-900/40"
      >
        <p class="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Paused for performance — enable anyway:
        </p>
        <div class="space-y-3">
          {#each PERFORMANCE_HEAVY_PLUGINS as heavy (heavy.id)}
            <div class="flex justify-between items-center gap-4">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{heavy.name}</p>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">{heavy.description}</p>
              </div>
              <Switch
                state={$settingsState.performanceModePluginOverrides?.[heavy.id] === true}
                onChange={(forceOn: boolean) => setPerformanceModePluginOverride(heavy.id, forceOn)}
              />
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
{/each}

{#if matchesSearch(
  searchQuery,
  "Home Page Assessments",
  "Include Past Assessments",
  "Maximum Subjects",
  "Maximum Assessments per Subject",
)}
  <div class="border-none">
    <div
      class="p-1 my-1 from-white to-zinc-100 bg-gradient-to-br rounded-xl border shadow-sm border-zinc-200/50 dark:border-zinc-700/40 dark:to-zinc-900/50 dark:from-zinc-900/40"
    >
      <div class="flex justify-between items-center px-5 py-4">
        <div class="pr-4">
          <h2 class="text-xl font-bold">Home Page Assessments</h2>
          <p class="text-base text-zinc-600 dark:text-zinc-300">
            Limit upcoming assessments shown on the home page by subject
          </p>
        </div>
      </div>
      <div
        class="flex justify-between items-center px-5 py-4 pl-7 border-t border-zinc-100 dark:border-zinc-700/50"
      >
        <div class="pr-4">
          <h2 class="text-xl font-bold">Include Past Assessments</h2>
          <p class="text-base text-zinc-600 dark:text-zinc-300">
            Show past-due assessments from the upcoming list, matching the Assessments page
          </p>
        </div>
        <div>
          <Switch
            state={$settingsState.homeUpcomingIncludePast ?? true}
            onChange={(isOn: boolean) => (settingsState.homeUpcomingIncludePast = isOn)}
          />
        </div>
      </div>
      <div
        class="flex justify-between items-center px-5 py-4 pl-7 border-t border-zinc-100 dark:border-zinc-700/50"
      >
        <div class="pr-4">
          <h2 class="text-xl font-bold">Maximum Subjects</h2>
          <p class="text-base text-zinc-600 dark:text-zinc-300">
            Number of subjects to include, ordered by soonest due date
          </p>
        </div>
        <Select
          value={String($settingsState.homeUpcomingSubjectsMax ?? 5)}
          onChange={(value: string) => (settingsState.homeUpcomingSubjectsMax = Number(value))}
          options={[
            { value: "0", label: "All" },
            { value: "3", label: "3" },
            { value: "5", label: "5" },
            { value: "7", label: "7" },
            { value: "10", label: "10" },
            { value: "15", label: "15" },
          ]}
        />
      </div>
      <div
        class="flex justify-between items-center px-5 py-4 pl-7 border-t border-zinc-100 dark:border-zinc-700/50"
      >
        <div class="pr-4">
          <h2 class="text-xl font-bold">Maximum Assessments per Subject</h2>
          <p class="text-base text-zinc-600 dark:text-zinc-300">
            Assessments shown for each included subject
          </p>
        </div>
        <Select
          value={String($settingsState.homeUpcomingAssessmentsPerSubjectMax ?? 0)}
          onChange={(value: string) =>
            (settingsState.homeUpcomingAssessmentsPerSubjectMax = Number(value))}
          options={[
            { value: "0", label: "All" },
            { value: "1", label: "1" },
            { value: "2", label: "2" },
            { value: "3", label: "3" },
            { value: "5", label: "5" },
            { value: "10", label: "10" },
          ]}
        />
      </div>
    </div>
  </div>
{/if}
