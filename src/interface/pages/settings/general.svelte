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

  const { showColourPicker } = $props<{ showColourPicker: () => void }>();
</script>

{#snippet Setting({ title, description, Component, props }: SettingsList) }
<div class="flex items-center justify-between px-4 py-3">
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
        onClick: () => browser.runtime.sendMessage({ type: 'currentTab', info: 'EditSidebar' },
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
      title: "Notification Collector",
      description: "Uncaps the 9+ limit for notifications, showing the real number.",
      id: 7,
      Component: Switch,
      props: {
        state: $settingsState.notificationcollector,
        onChange: (isOn: boolean) => settingsState.notificationcollector = isOn
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
      title: "Edit News URL",
      description: "Edit the news URL. Quite bad and will be fixed later.",
      id: 8,
      Component: Button,
      props: {
        state: $settingsState.NewsURL,
        onClick: () => settingsState.NewsURL = prompt('Enter news URL...'),
        text: "Edit"
      }
    },
    {
      title: "Lesson Alerts",
      description: "Sends a native browser notification ~5 minutes prior to lessons.",
      id: 8,
      Component: Switch,
      props: {
        state: $settingsState.lessonalert,
        onChange: (isOn: boolean) => settingsState.lessonalert = isOn
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
      title: "BetterSEQTA+",
      description: "Enables BetterSEQTA+ features",
      id: 11,
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
    <div class="flex items-center justify-between px-4 py-3">
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
