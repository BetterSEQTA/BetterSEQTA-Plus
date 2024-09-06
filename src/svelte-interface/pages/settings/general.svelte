<script lang="ts">
  import Switch from "../../components/Switch.svelte"
  import Button from "../../components/Button.svelte"
  //import PickerSwatch from "../../components/PickerSwatch.svelte"
  import Slider from "../../components/Slider.svelte"

  import browser from "webextension-polyfill"
  
  import type { SettingsList } from "@/svelte-interface/types/SettingsProps"
  import { settingsState } from "@/seqta/utils/listeners/SettingsState.ts"
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
      Component: Switch as any,
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
    /* {
      title: "Custom Theme Colour",
      description: "Customise the overall theme colour of SEQTA Learn.",
      id: 4,
      Component: PickerSwatch
    }, */
    {
      title: "Edit Sidebar Layout",
      description: "Customise the sidebar layout.",
      id: 6,
      Component: Button,
      props: {
        onClick: () => browser.runtime.sendMessage({ type: 'currentTab', info: 'EditSidebar' }),
        text: "Edit"
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
      title: "BetterSEQTA+",
      description: "Enables BetterSEQTA+ features",
      id: 9,
      Component: Switch,
      props: {
        state: $settingsState.onoff,
        onChange: (isOn: boolean) => settingsState.onoff = isOn
      }
    }
  ] as setting}
    {@render Setting(setting)}
  {/each}
</div>