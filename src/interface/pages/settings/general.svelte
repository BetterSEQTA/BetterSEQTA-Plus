<script lang="ts">
  import Switch from "../../components/Switch.svelte"
  import Button from "../../components/Button.svelte"
  import Slider from "../../components/Slider.svelte"
  import Select from "@/interface/components/Select.svelte"

  import browser from "webextension-polyfill"

  import type { SettingsList } from "@/interface/types/SettingsProps"
  import { settingsState } from "@/seqta/utils/listeners/SettingsState.ts"
  import PickerSwatch from "@/interface/components/PickerSwatch.svelte"
  import hideSensitiveContent from "@/seqta/ui/dev/hideSensitiveContent"

  import { getAllPluginSettings } from "@/plugins"

  interface PluginSetting {
    id: string;
    title: string;
    description?: string;
    type: string;
    default: any;
    options?: Array<{value: string, label: string}>;
  }

  interface Plugin {
    pluginId: string;
    name: string;
    description: string;
    settings: Record<string, PluginSetting>;
  }

  const pluginSettings = getAllPluginSettings() as Plugin[];
  const pluginSettingsValues = $state<Record<string, Record<string, any>>>({});
  let nextPluginSettingId = 1000;
  const pluginSettingMap = new Map<number, {pluginId: string, settingKey: string}>();

  function getPluginSettingId(pluginId: string, settingKey: string): number {
    const id = nextPluginSettingId++;
    pluginSettingMap.set(id, {pluginId, settingKey});
    return id;
  }
  
  async function loadPluginSettings() {
    for (const plugin of pluginSettings) {
      if (Object.keys(plugin.settings).length === 0) continue;
      
      const storageKey = `plugin.${plugin.pluginId}.settings`;
      const stored = await browser.storage.local.get(storageKey);
      
      pluginSettingsValues[plugin.pluginId] = stored[storageKey] || {};
      
      for (const [key, setting] of Object.entries(plugin.settings)) {
        if (pluginSettingsValues[plugin.pluginId][key] === undefined) {
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

  function getPluginSettingEntries() {
    const entries: any[] = [];
    
    pluginSettings.forEach(plugin => {
      if (Object.keys(plugin.settings).length === 0) return;
      
      // Add enable/disable toggle if plugin has disableToggle set
      if ((plugin as any).disableToggle) {
        entries.push({
          title: `Enable ${plugin.name}`,
          description: `${plugin.description}`,
          id: getPluginSettingId(plugin.pluginId, 'enabled'),
          Component: Switch,
          props: {
            state: pluginSettingsValues[plugin.pluginId]?.enabled ?? true,
            onChange: (value: boolean) => {
              updatePluginSetting(plugin.pluginId, 'enabled', value);
              // The plugin manager will handle the actual enabling/disabling
            }
          }
        });
      }
      
      Object.entries(plugin.settings).forEach(([key, setting]) => {
        const id = getPluginSettingId(plugin.pluginId, key);
        
        entries.push({
          title: setting.title || key,
          description: setting.description || '',
          id,
          Component: setting.type === 'boolean' ? Switch :
                    setting.type === 'select' ? Select :
                    setting.type === 'number' ? Slider : 
                    setting.type === 'string' ? (setting.options ? Select : null) : Switch,
          props: {
            state: pluginSettingsValues[plugin.pluginId]?.[key] ?? setting.default,
            onChange: (value: any) => {
              if (setting.type === 'number' && typeof value === 'string') {
                value = parseFloat(value);
              }
              updatePluginSetting(plugin.pluginId, key, value);
            },
            options: setting.options
          }
        });
      });
    });
    
    return entries;
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
      title: "Animated Background",
      description: "Adds an animated background to BetterSEQTA. (May impact battery life)",
      id: 2,
      Component: Switch,
      props: {
        state: $settingsState.animatedbk,
        onChange: (isOn: boolean) => settingsState.animatedbk = isOn
      }
    },
    {
      title: "Animated Background Speed",
      description: "Controls the speed of the animated background.",
      id: 3,
      Component: Slider,
      props: {
        state: $settingsState.bksliderinput,
        onChange: (value: number) => settingsState.bksliderinput = `${value}`
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
      title: "Assessment Average",
      description: "Shows your subject average for assessments.",
      id: 8,
      Component: Switch,
      props: {
        state: $settingsState.assessmentsAverage,
        onChange: (isOn: boolean) => settingsState.assessmentsAverage = isOn
      }
    },
    {
      title: "Letter Grade Averages",
      description: "Shows the letter grade instead of the percentage in subject averages.",
      id: 8,
      Component: Switch,
      props: {
        state: $settingsState.lettergrade,
        onChange: (isOn: boolean) => settingsState.lettergrade = isOn
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
    },
    ...getPluginSettingEntries(),
    {
      title: "BetterSEQTA+",
      description: "Enables BetterSEQTA+ features",
      id: 12,
      Component: Switch,
      props: {
        state: $settingsState.onoff,
        onChange: (isOn: boolean) => settingsState.onoff = isOn
      }
    }
  ] as option}
    {@render Setting(option)}
  {/each}

  {#if $settingsState.devMode}
    <div class="flex items-center justify-between px-4 py-3 mt-4 pt-[1.75rem]">
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
        <Button 
          onClick={() => hideSensitiveContent()}
          text="Hide"
        />
      </div>
    </div>
  {/if}
</div>
