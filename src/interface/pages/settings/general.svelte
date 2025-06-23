<script lang="ts">
  import Switch from "../../components/Switch.svelte"
  import Button from "../../components/Button.svelte"
  import Slider from "../../components/Slider.svelte"
  import Select from "@/interface/components/Select.svelte"
  import HotkeyInput from "@/interface/components/HotkeyInput.svelte"

  import browser from "webextension-polyfill"

  import type { SettingsList } from "@/interface/types/SettingsProps"
  import { settingsState } from "@/seqta/utils/listeners/SettingsState.ts"
  import PickerSwatch from "@/interface/components/PickerSwatch.svelte"

  import { getAllPluginSettings } from "@/plugins"
  import type { BooleanSetting, StringSetting, NumberSetting, SelectSetting, ButtonSetting, HotkeySetting, ComponentSetting } from "@/plugins/core/types"

  // Union type representing all possible settings
  type SettingType =
    (Omit<BooleanSetting, 'type'> & { type: 'boolean', id: string }) |
    (Omit<StringSetting, 'type'> & { type: 'string', id: string }) |
    (Omit<NumberSetting, 'type'> & { type: 'number', id: string }) |
    (Omit<SelectSetting<string>, 'type'> & {
      type: 'select',
      id: string,
      options: string[]
    }) |
    (Omit<ButtonSetting, 'type'> & {
      type: 'button',
      id: string
    }) |
    (Omit<HotkeySetting, 'type'> & {
      type: 'hotkey',
      id: string
    }) |
    (Omit<ComponentSetting, 'type'> & {
      type: 'component',
      id: string,
      component: any
    });

  interface Plugin {
    pluginId: string;
    name: string;
    description: string;
    beta?: boolean;
    settings: Record<string, SettingType>;
  }

  const pluginSettings = getAllPluginSettings() as Plugin[];
  const pluginSettingsValues = $state<Record<string, Record<string, any>>>({});
  
  async function loadPluginSettings() {
    for (const plugin of pluginSettings) {
      if (Object.keys(plugin.settings).length === 0) continue;
      
      const storageKey = `plugin.${plugin.pluginId}.settings`;
      const stored = await browser.storage.local.get(storageKey);
      
      pluginSettingsValues[plugin.pluginId] = stored[storageKey] || {};
      
      for (const [key, setting] of Object.entries(plugin.settings)) {
        if (
          pluginSettingsValues[plugin.pluginId][key] === undefined &&
          setting.type !== 'button' &&
          setting.type !== 'component'
        ) {
          pluginSettingsValues[plugin.pluginId][key] = setting.default;
        }
      }
    }
  }
  
  async function updatePluginSetting(pluginId: string, key: string, value: any) {
    const storageKey = `plugin.${pluginId}.settings`;
    
    if (!pluginSettingsValues[pluginId]) {
      pluginSettingsValues[pluginId] = {};
    }
    pluginSettingsValues[pluginId][key] = value;
    
    const stored = await browser.storage.local.get(storageKey);
    const currentSettings = (stored[storageKey] || {}) as Record<string, any>;
    
    currentSettings[key] = value;
    
    await browser.storage.local.set({ [storageKey]: currentSettings });
  }

  $effect(() => {
    loadPluginSettings();
  })

  const { showColourPicker } = $props<{ showColourPicker: () => void }>();
</script>

{#snippet Setting({ title, description, Component, props }: SettingsList) }
<div class="flex justify-between items-center px-4 py-3">
  <div class="pr-4">
    <h2 class="text-sm font-bold">{title}</h2>
    <p class="text-xs">{description}</p>
  </div>
  <div>
     <Component {...props} />
  </div>
</div>
{/snippet}

<div class="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-700">
  {#each [
    {
      title: "Transparency Effects",
      description: "Enables transparency effects on certain elements such as blur. (May impact battery life)",
      id: 1,
      Component: Switch,
      props: {
        state: $settingsState.transparencyEffects,
        onChange: (isOn: boolean) => settingsState.transparencyEffects = isOn
      }
    },
    {
      title: "Custom Theme Colour",
      description: "Customise the overall theme colour of SEQTA Learn.",
      id: 4,
      Component: PickerSwatch,
      props: {
        onClick: showColourPicker
      }
    },
    {
      title: "Edit Sidebar Layout",
      description: "Customise the sidebar layout.",
      id: 5,
      Component: Button,
      props: {
        onClick: () => browser.runtime.sendMessage({ type: 'currentTab', info: 'EditSidebar' }),
        text: "Edit"
      }
    },
    {
      title: "Animations",
      description: "Enables animations on certain pages.",
      id: 6,
      Component: Switch,
      props: {
        state: $settingsState.animations,
        onChange: (isOn: boolean) => settingsState.animations = isOn
      }
    },
    {
      title: "12 Hour Time",
      description: "Prefer 12 hour time format for SEQTA",
      id: 9,
      Component: Switch,
      props: {
        state: $settingsState.timeFormat === "12",
        onChange: (isOn: boolean) => settingsState.timeFormat = isOn ? "12" : "24"
      }
    },
    {
      title: "Default Page",
      description: "The page to load when SEQTA Learn is opened.",
      id: 10,
      Component: Select,
      props: {
        state: $settingsState.defaultPage,
        onChange: (value: string) => settingsState.defaultPage = value,
        options: [
          { value: 'home', label: 'Home' },
          { value: 'dashboard', label: 'Dashboard' },
          { value: 'timetable', label: 'Timetable' },
          { value: 'welcome', label: 'Welcome' },
          { value: 'messages', label: 'Messages' },
          { value: 'documents', label: 'Documents' },
          { value: 'reports', label: 'Reports' },
        ]
      }
    },
    {
      title: "News Feed Source",
      description: "Choose sources of your news feed.",
      id: 11,
      Component: Select,
      props: {
        state: $settingsState.newsSource,
        onChange: (value: string) => settingsState.newsSource = value,
        options: [
          { value: "australia", label: "Australia" },
          { value: "usa", label: "USA" },
          { value: "taiwan", label: "Taiwan" },
          { value: "hong_kong", label: "Hong Kong" },
          { value: "panama", label: "Panama" },
          { value: "canada", label: "Canada" },
          { value: "singapore", label: "Singapore" },
          { value: "uk", label: "UK" },
          { value: "japan", label: "Japan" },
          { value: "netherlands", label: "Netherlands" }
        ]
      }
    }
  ] as option}
    {@render Setting(option)}
  {/each}
  
  {#each pluginSettings as plugin}
  <div class="border-none">
    <div class="p-1 my-1 from-white to-zinc-100 bg-gradient-to-br rounded-xl border shadow-sm border-zinc-200/50 dark:border-zinc-700/40 dark:to-zinc-900/50 dark:from-zinc-900/40 {!(plugin as any).disableToggle && Object.keys(plugin.settings).length === 0 ? 'hidden' : ''}">
      <!-- Always show enable toggle if disableToggle is true -->
        {#if (plugin as any).disableToggle}
          <div class="flex justify-between items-center px-4 py-3">
            <div class="pr-4">
              <h2 class="flex gap-2 items-center text-sm font-bold">
                Enable {plugin.name}
                {#if plugin.beta}
                  <span class="px-2 py-0.5 text-xs font-medium text-orange-800 bg-orange-100 rounded-full border border-orange-300/30 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-900/30">
                    Beta
                  </span>
                {/if}
              </h2>
              <p class="text-xs">{plugin.description}</p>
            </div>
            <div>
              <Switch
                state={pluginSettingsValues[plugin.pluginId]?.enabled ?? true}
                onChange={(value) => updatePluginSetting(plugin.pluginId, 'enabled', value)}
              />
            </div>
          </div>
        {/if}
  
        {#if !((plugin as any).disableToggle) || (pluginSettingsValues[plugin.pluginId]?.enabled ?? true)}
          {#each Object.entries(plugin.settings) as [key, setting]}
            <!-- Skip the 'enabled' setting if it's part of the settings object -->
            {#if key !== 'enabled'}
              <div class="flex justify-between items-center px-4 py-3">
                <div class="pr-4">
                  <h2 class="text-sm font-bold">{setting.title || key}</h2>
                  <p class="text-xs">{setting.description || ''}</p>
                </div>
                <div>
                  {#if setting.type === 'boolean'}
                    <Switch
                      state={pluginSettingsValues[plugin.pluginId]?.[key] ?? setting.default}
                      onChange={(value) => updatePluginSetting(plugin.pluginId, key, value)}
                    />
                  {:else if setting.type === 'number'}
                    <Slider
                      state={pluginSettingsValues[plugin.pluginId]?.[key] ?? setting.default}
                      onChange={(value) => updatePluginSetting(plugin.pluginId, key, value)}
                      min={setting.min}
                      max={setting.max}
                      step={setting.step}
                    />
                  {:else if setting.type === 'string'}
                    <input
                      type="text"
                      class="px-2 py-1 text-sm rounded-md dark:bg-[#38373D]/50 bg-[#DDDDDD] dark:text-white border-none"
                      value={pluginSettingsValues[plugin.pluginId]?.[key] ?? setting.default}
                      oninput={(e) => updatePluginSetting(plugin.pluginId, key, e.currentTarget.value)}
                    />                
                  {:else if setting.type === 'select'}
                    <Select
                    state={pluginSettingsValues[plugin.pluginId]?.[key] ?? setting.default}
                    onChange={(value) => updatePluginSetting(plugin.pluginId, key, value)}
                    options={(setting.options as string[]).map(opt => ({
                      value: opt,
                      label: opt.charAt(0).toUpperCase() + opt.slice(1)
                      }))}
                    />
                  {:else if setting.type === 'button'}
                    <Button
                      onClick={() => setting.trigger?.()}
                      text={setting.title}
                    />
                  {:else if setting.type === 'hotkey'}
                    <HotkeyInput
                      value={pluginSettingsValues[plugin.pluginId]?.[key] ?? setting.default}
                      onChange={(value) => updatePluginSetting(plugin.pluginId, key, value)}
                    />
                  {:else if setting.type === 'component'}
                    {#if setting.component}
                      {@const Component = setting.component}
                      <Component />
                    {/if}
                  {/if}
                </div>
              </div>
            {/if}
          {/each}
        {/if}
      </div>
  </div>
  {/each}

  <div class="p-1 border-none"></div>

  {@render Setting({
    title: "BetterSEQTA+",
    description: "Enables BetterSEQTA+ features",
    id: 12,
    Component: Switch,
    props: {
      state: $settingsState.onoff,
      onChange: (isOn: boolean) => settingsState.onoff = isOn
    }
  })}

  {#if $settingsState.devMode}
    <div class="flex-col p-1 my-1 bg-gradient-to-br from-white rounded-xl border shadow-sm to-zinc-100 border-zinc-200/50 dark:border-zinc-700/40 dark:to-zinc-900/50 dark:from-zinc-900/40">
      <div class="flex justify-between items-center px-4 py-3">
        <div class="pr-4">
          <h2 class="text-sm font-bold">Developer Mode</h2>
          <p class="text-xs">Enables developer mode, allowing you to test new features and changes.</p>
        </div>
        <div>
          <Switch state={$settingsState.devMode} onChange={(isOn: boolean) => settingsState.devMode = isOn} />
        </div>
      </div>
      <div class="flex justify-between items-center px-4 py-3">
        <div class="pr-4">
          <h2 class="text-sm font-bold">Sensitive Hider</h2>
          <p class="text-xs">Replace sensitive content with mock data</p>
        </div>
        <div>
          <Switch
            state={$settingsState.hideSensitiveContent ?? false}
            onChange={(isOn: boolean) => settingsState.hideSensitiveContent = isOn}
          />
        </div>
      </div>
      <div class="flex justify-between items-center px-4 py-3">
        <div class="pr-4">
          <h2 class="text-sm font-bold">Mock Notices</h2>
          <p class="text-xs">Use fake notice data on homepage instead of real data</p>
        </div>
        <div>
          <Switch 
            state={$settingsState.mockNotices ?? false} 
            onChange={(isOn: boolean) => settingsState.mockNotices = isOn} 
          />
        </div>
      </div>
    </div>
  {/if}
</div>
