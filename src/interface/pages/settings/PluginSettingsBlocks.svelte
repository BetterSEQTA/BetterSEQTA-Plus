<script lang="ts">
  import Switch from "@/interface/components/Switch.svelte";
  import Button from "@/interface/components/Button.svelte";
  import Slider from "@/interface/components/Slider.svelte";
  import Select from "@/interface/components/Select.svelte";
  import HotkeyInput from "@/interface/components/HotkeyInput.svelte";
  import SettingRow from "./SettingRow.svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import { cloudAuth } from "@/seqta/utils/CloudAuth";
  import {
    setPerformanceModePluginOverride,
  } from "@/seqta/utils/performanceMode";
  import { PERFORMANCE_HEAVY_PLUGIN_IDS } from "@/seqta/utils/performanceModeConfig";
  import { onMount } from "svelte";
  import {
    matchesSearch,
    PLUGIN_SECTION_BY_ID,
    type SettingsSectionId,
    type SettingsSectionSharedProps,
  } from "./shared";
  import {
    pluginSettingsStore,
    type PluginSettingsEntry,
  } from "./pluginSettingsState.svelte";

  let {
    section,
    showDisclaimer,
    searchQuery = "",
  }: SettingsSectionSharedProps & { section: SettingsSectionId } = $props();

  let cloudState = $state(cloudAuth.state);
  $effect(() => {
    const unsub = cloudAuth.subscribe((s) => {
      cloudState = s;
    });
    return unsub;
  });

  onMount(() => {
    void pluginSettingsStore.ensureLoaded();
  });

  const pluginHit = (plugin: PluginSettingsEntry) =>
    matchesSearch(
      searchQuery,
      plugin.name,
      plugin.description,
      ...Object.values(plugin.settings).flatMap((s) => [s.title, s.description]),
    );

  const visiblePlugins = $derived(
    pluginSettingsStore.plugins.filter(
      (plugin) =>
        (PLUGIN_SECTION_BY_ID[plugin.pluginId] ?? "features") === section &&
        pluginHit(plugin),
    ),
  );

  const pluginPerfPaused = (pluginId: string) =>
    ($settingsState.performanceMode ?? false) &&
    $settingsState.performanceModePluginOverrides?.[pluginId] !== true &&
    PERFORMANCE_HEAVY_PLUGIN_IDS.has(pluginId);
</script>

{#if pluginSettingsStore.loading && visiblePlugins.length === 0}
  <div class="px-5 py-6 text-sm text-zinc-400">Loading plugin settings…</div>
{/if}

{#each visiblePlugins as plugin (plugin.pluginId)}
  {@const perfPaused = pluginPerfPaused(plugin.pluginId)}
  <div class="border-none">
    <div
      class="p-1 my-1 from-white to-zinc-100 bg-gradient-to-br rounded-xl border shadow-sm border-zinc-200/50 dark:border-zinc-700/40 dark:to-zinc-900/50 dark:from-zinc-900/40 {!(plugin as PluginSettingsEntry & { disableToggle?: boolean }).disableToggle && Object.keys(plugin.settings).length === 0 ? 'hidden' : ''} {perfPaused ? 'opacity-60' : ''}"
    >
      {#if perfPaused}
        <div
          class="flex justify-between items-center px-5 py-3 border-b border-amber-200/60 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-950/20"
        >
          <p class="text-sm text-amber-800 dark:text-amber-200">
            Paused by Performance Mode — enable anyway
          </p>
          <Switch
            state={$settingsState.performanceModePluginOverrides?.[plugin.pluginId] === true}
            onChange={(forceOn: boolean) =>
              setPerformanceModePluginOverride(plugin.pluginId, forceOn)}
          />
        </div>
      {/if}

      {#if plugin.disableToggle}
        <div class="flex justify-between items-center px-5 py-4 {perfPaused ? 'pointer-events-none' : ''}">
          <div class="pr-4">
            <h2 class="flex gap-2 items-center text-xl font-bold">
              Enable {plugin.name}
              {#if plugin.beta}
                <span
                  class="px-2 py-0.5 text-xs font-medium text-orange-800 bg-orange-100 rounded-full border border-orange-300/30 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-900/30"
                >
                  Beta
                </span>
              {/if}
            </h2>
            <p class="text-base text-zinc-600 dark:text-zinc-300">{plugin.description}</p>
          </div>
          <div>
            <Switch
              state={(pluginSettingsStore.values[plugin.pluginId]?.enabled as boolean | undefined) ?? true}
              onChange={async (value) => {
                if (plugin.pluginId === "assessments-average" && value === true) {
                  showDisclaimer(
                    async () => {
                      await pluginSettingsStore.update(plugin.pluginId, "enabled", true);
                    },
                    () => {},
                    "Assessment Averages Disclaimer",
                    "This feature calculates a simple average of your assessment grades. It does not take into account:\n• Assessment weightings\n• Different grading scales\n• Other factors used in official reports\n\nThe displayed average may be inaccurate compared to your actual marks found in reports.\n\nDo you want to enable this feature?",
                  );
                  return;
                }
                await pluginSettingsStore.update(plugin.pluginId, "enabled", value);
              }}
            />
          </div>
        </div>
      {/if}

      {#if !perfPaused && (!plugin.disableToggle || ((pluginSettingsStore.values[plugin.pluginId]?.enabled as boolean | undefined) ?? true))}
        {#each Object.entries(plugin.settings) as [key, setting] (key)}
          {#if key !== "enabled" && !(key === "useCloudPfp" && !cloudState.isLoggedIn)}
            <div class="flex justify-between items-center px-5 py-4">
              <div class="pr-4">
                <h2 class="text-xl font-bold">{setting.title || key}</h2>
                <p class="text-base text-zinc-600 dark:text-zinc-300">{setting.description || ""}</p>
              </div>
              <div>
                {#if setting.type === "boolean"}
                  <Switch
                    state={(pluginSettingsStore.values[plugin.pluginId]?.[key] as boolean | undefined) ?? setting.default}
                    onChange={(value) => pluginSettingsStore.update(plugin.pluginId, key, value)}
                  />
                {:else if setting.type === "number"}
                  <div class="w-28 shrink-0">
                    <Slider
                      state={(pluginSettingsStore.values[plugin.pluginId]?.[key] as number | undefined) ?? setting.default}
                      onChange={(value) => pluginSettingsStore.update(plugin.pluginId, key, value)}
                      min={setting.min}
                      max={setting.max}
                      step={setting.step}
                    />
                  </div>
                {:else if setting.type === "string"}
                  <input
                    type="text"
                    class="px-2 py-1 text-sm rounded-md dark:bg-[#38373D]/50 bg-[#DDDDDD] dark:text-white border-none"
                    value={(pluginSettingsStore.values[plugin.pluginId]?.[key] as string | undefined) ?? setting.default}
                    oninput={(e) =>
                      pluginSettingsStore.update(plugin.pluginId, key, e.currentTarget.value)}
                  />
                {:else if setting.type === "select"}
                  <Select
                    value={(pluginSettingsStore.values[plugin.pluginId]?.[key] as string | undefined) ?? setting.default}
                    onChange={(value) => pluginSettingsStore.update(plugin.pluginId, key, value)}
                    options={(setting.options as string[]).map((opt) => ({
                      value: opt,
                      label: opt.charAt(0).toUpperCase() + opt.slice(1),
                    }))}
                  />
                {:else if setting.type === "button"}
                  <Button onClick={() => setting.trigger?.()} text={setting.title} />
                {:else if setting.type === "hotkey"}
                  <HotkeyInput
                    value={(pluginSettingsStore.values[plugin.pluginId]?.[key] as string | undefined) ?? setting.default}
                    onChange={(value) => pluginSettingsStore.update(plugin.pluginId, key, value)}
                  />
                {:else if setting.type === "component" && setting.component}
                  {@const Component = setting.component as import("svelte").Component}
                  <Component />
                {/if}
              </div>
            </div>
          {/if}
        {/each}
      {/if}
    </div>

    {#if plugin.pluginId === "global-search"}
      <SettingRow
        title="Theme of the Month"
        description="Show the monthly featured theme popup when a new entry is available"
        id={15}
        Component={Switch}
        {searchQuery}
        props={{
          state: !($settingsState.themeOfTheMonthDisabled ?? false),
          onChange: (isOn: boolean) => (settingsState.themeOfTheMonthDisabled = !isOn),
        }}
      />
    {/if}
  </div>
{/each}
