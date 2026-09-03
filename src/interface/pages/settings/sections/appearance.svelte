<script lang="ts">
  import Switch from "@/interface/components/Switch.svelte";
  import Button from "@/interface/components/Button.svelte";
  import PickerSwatch from "@/interface/components/PickerSwatch.svelte";
  import SidebarAppearance from "@/interface/components/SidebarAppearance.svelte";
  import SettingRow from "../SettingRow.svelte";
  import PluginSettingsBlocks from "../PluginSettingsBlocks.svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
  import { matchesSearch, type SettingsSectionSharedProps } from "../shared";

  let {
    showColourPicker,
    showFontPicker,
    showDisclaimer,
    searchQuery = "",
  }: SettingsSectionSharedProps = $props();

  const isEngage = isSeqtaEngageExperience();
</script>

{#each [
  {
    title: "Custom Theme Colour",
    description: "Customise the overall theme colour of SEQTA Learn",
    id: 4,
    Component: PickerSwatch,
    props: { onClick: showColourPicker },
  },
  {
    title: "Interface Font",
    description: "Choose the typeface used across SEQTA Learn",
    id: 16,
    Component: Button,
    props: { onClick: showFontPicker, text: "Change" },
  },
] as option (option.id)}
  <SettingRow {...option} {searchQuery} />
{/each}

{#if !isEngage && matchesSearch(searchQuery, "Sidebar Style", "Item Size", "Corner Radius", "Active Indicator", "Sidebar Width", "Transparency Effects", "Blur Strength")}
  <div class="border-none">
    <SidebarAppearance />
  </div>
{/if}

{#if matchesSearch(searchQuery, "Adaptive Theme Colour", "Soft Gradient", "Smooth colour transition")}
  <div class="border-none">
    <div
      class="p-1 my-1 from-white to-zinc-100 bg-gradient-to-br rounded-xl border shadow-sm border-zinc-200/50 dark:border-zinc-700/40 dark:to-zinc-900/50 dark:from-zinc-900/40"
    >
      <div class="flex justify-between items-center px-5 py-4">
        <div class="pr-4">
          <h2 class="text-xl font-bold">Adaptive Theme Colour</h2>
          <p class="text-base text-zinc-600 dark:text-zinc-300">
            Change the theme colour based on the current class (e.g. when viewing a course or
            assessments page)
          </p>
        </div>
        <div>
          <Switch
            state={$settingsState.adaptiveThemeColour ?? false}
            onChange={(isOn: boolean) => (settingsState.adaptiveThemeColour = isOn)}
          />
        </div>
      </div>
      {#if $settingsState.adaptiveThemeColour}
        <div
          class="flex justify-between items-center px-5 py-4 pl-7 border-t border-zinc-100 dark:border-zinc-700/50"
        >
          <div class="pr-4">
            <h2 class="text-xl font-bold">Soft Gradient</h2>
            <p class="text-base text-zinc-600 dark:text-zinc-300">
              Use a soft gradient instead of a solid colour when viewing a class
            </p>
          </div>
          <div>
            <Switch
              state={$settingsState.adaptiveThemeGradient ?? false}
              onChange={(isOn: boolean) => (settingsState.adaptiveThemeGradient = isOn)}
            />
          </div>
        </div>
        <div
          class="flex justify-between items-center px-5 py-4 pl-7 border-t border-zinc-100 dark:border-zinc-700/50"
        >
          <div class="pr-4">
            <h2 class="text-xl font-bold">Smooth colour transition</h2>
            <p class="text-base text-zinc-600 dark:text-zinc-300">
              Ease between class/subject colours when navigating instead of switching instantly
            </p>
          </div>
          <div>
            <Switch
              state={$settingsState.adaptiveThemeColourTransition ?? true}
              onChange={(isOn: boolean) => (settingsState.adaptiveThemeColourTransition = isOn)}
            />
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<PluginSettingsBlocks section="appearance" {showDisclaimer} {searchQuery} />
