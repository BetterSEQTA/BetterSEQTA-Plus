<script lang="ts">
  import Switch from "../../components/Switch.svelte" // Importing the Switch component
  import Button from "../../components/Button.svelte" // Importing the Button component
  import Slider from "../../components/Slider.svelte" // Importing the Slider component
  import Select from "@/interface/components/Select.svelte" // Importing the Select component

  import browser from "webextension-polyfill" // Importing webextension-polyfill for browser extension functionality

  import type { SettingsList } from "@/interface/types/SettingsProps" // Importing SettingsList type
  import { settingsState } from "@/seqta/utils/listeners/SettingsState.ts" // Importing settings state
  import PickerSwatch from "@/interface/components/PickerSwatch.svelte" // Importing PickerSwatch component
  import hideSensitiveContent from "@/seqta/ui/dev/hideSensitiveContent" // Importing function to hide sensitive content

  import { getAllPluginSettings } from "@/plugins" // Importing function to get all plugin settings
  import type { BooleanSetting, StringSetting, NumberSetting, SelectSetting } from "@/plugins/core/types" // Importing setting types

  // Union type representing all possible settings for the plugin
  type SettingType = 
    (Omit<BooleanSetting, 'type'> & { type: 'boolean', id: string }) |
    (Omit<StringSetting, 'type'> & { type: 'string', id: string }) |
    (Omit<NumberSetting, 'type'> & { type: 'number', id: string }) |
    (Omit<SelectSetting<string>, 'type'> & { 
      type: 'select', 
      id: string, 
      options: string[] // Select setting with string options
    });

  interface Plugin {
    pluginId: string; // Unique ID for the plugin
    name: string; // Name of the plugin
    description: string; // Description of the plugin
    settings: Record<string, SettingType>; // Settings object for the plugin
  }

  const pluginSettings = getAllPluginSettings() as Plugin[]; // Fetch all plugin settings
  const pluginSettingsValues = $state<Record<string, Record<string, any>>>({}); // State to hold the plugin settings values
  
  // Function to load plugin settings from browser storage
  async function loadPluginSettings() {
    for (const plugin of pluginSettings) {
      if (Object.keys(plugin.settings).length === 0) continue; // Skip if there are no settings for the plugin
      
      const storageKey = `plugin.${plugin.pluginId}.settings`; // Create storage key
      const stored = await browser.storage.local.get(storageKey); // Retrieve stored settings from local storage
      
      pluginSettingsValues[plugin.pluginId] = stored[storageKey] || {}; // Set plugin settings values from storage
      
      for (const [key, setting] of Object.entries(plugin.settings)) {
        if (pluginSettingsValues[plugin.pluginId][key] === undefined) {
          pluginSettingsValues[plugin.pluginId][key] = setting.default; // Set default setting value if not present
        }
      }
    }
  }
  
  // Function to update a plugin setting in browser storage
  async function updatePluginSetting(pluginId: string, key: string, value: any) {
    const storageKey = `plugin.${pluginId}.settings`; // Create storage key
    
    if (!pluginSettingsValues[pluginId]) {
      pluginSettingsValues[pluginId] = {}; // Initialize plugin settings if not present
    }
    pluginSettingsValues[pluginId][key] = value; // Update the setting value in state
    
    const stored = await browser.storage.local.get(storageKey); // Retrieve stored settings from local storage
    const currentSettings = (stored[storageKey] || {}) as Record<string, any>;
    
    currentSettings[key] = value; // Update the specific setting
    
    await browser.storage.local.set({ [storageKey]: currentSettings }); // Save updated settings to local storage
  }

  $effect(() => {
    loadPluginSettings(); // Load plugin settings when component is initialized
  })

  const { showColourPicker } = $props<{ showColourPicker: () => void }>(); // Destructure to get showColourPicker function
</script>

{#snippet Setting({ title, description, Component, props }: SettingsList) }
<div class="flex justify-between items-center px-4 py-3">
  <div class="pr-4">
    <h2 class="text-sm font-bold">{title}</h2> <!-- Display setting title -->
    <p class="text-xs">{description}</p> <!-- Display setting description -->
  </div>
  <div>
     <Component {...props} /> <!-- Render the specific component with props -->
  </div>
</div>
{/snippet}

<div class="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-700">
  {#each [
    {
      title: "Transparency Effects",
      description: "Enables transparency effects on certain elements such as blur. (May impact battery life)",
      id: 1,
      Component: Switch, // Switch component for enabling/disabling transparency effects
      props: {
        state: $settingsState.transparencyEffects, // State for transparency effect toggle
        onChange: (isOn: boolean) => settingsState.transparencyEffects = isOn // Update state on change
      }
    },
    {
      title: "Custom Theme Colour",
      description: "Customise the overall theme colour of SEQTA Learn.",
      id: 4,
      Component: PickerSwatch, // PickerSwatch component for selecting theme color
      props: {
        onClick: showColourPicker // Show colour picker on click
      }
    },
    {
      title: "Edit Sidebar Layout",
      description: "Customise the sidebar layout.",
      id: 5,
      Component: Button, // Button component for editing sidebar layout
      props: {
        onClick: () => browser.runtime.sendMessage({ type: 'currentTab', info: 'EditSidebar' }), // Send message to browser extension for editing sidebar
        text: "Edit" // Button text
      }
    },
    {
      title: "Animations",
      description: "Enables animations on certain pages.",
      id: 6,
      Component: Switch, // Switch component for enabling/disabling animations
      props: {
        state: $settingsState.animations, // State for animation toggle
        onChange: (isOn: boolean) => settingsState.animations = isOn // Update state on change
      }
    },
    {
      title: "12 Hour Time",
      description: "Prefer 12 hour time format for SEQTA",
      id: 9,
      Component: Switch, // Switch component for 12-hour time format
      props: {
        state: $settingsState.timeFormat === "12", // State for time format toggle
        onChange: (isOn: boolean) => settingsState.timeFormat = isOn ? "12" : "24" // Update state on change
      }
    },
    {
      title: "Default Page",
      description: "The page to load when SEQTA Learn is opened.",
      id: 10,
      Component: Select, // Select component for choosing default page
      props: {
        state: $settingsState.defaultPage, // State for default page
        onChange: (value: string) => settingsState.defaultPage = value, // Update state on change
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
      Component: Select, // Select component for news feed source
      props: {
        state: $settingsState.newsSource, // State for news feed source
        onChange: (value: string) => settingsState.newsSource = value, // Update state on change
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
    {@render Setting(option)} <!-- Render settings for each option -->
  {/each}
  
  {#each pluginSettings as plugin} <!-- Iterate through each plugin's settings -->
  <div class="border-none">
    <div class="p-1 my-1 from-white to-zinc-100 bg-gradient-to-br rounded-xl border shadow-sm border-zinc-200/50 dark:border-zinc-700/40 dark:to-zinc-900/50 dark:from-zinc-900/40 {!(plugin as any).disableToggle && Object.keys(plugin.settings).length === 0 ? 'hidden' : ''}">
      <!-- Display enable toggle if disableToggle is true -->
        {#if (plugin as any).disableToggle}
          <div class="flex justify-between items-center px-4 py-3">
            <div class="pr-4">
              <h2 class="text-sm font-bold">Enable {plugin.name}</h2>
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
