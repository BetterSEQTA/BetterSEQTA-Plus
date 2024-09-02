<script lang="ts">
  import Switch from "../../components/Switch.svelte"
  import Button from "../../components/Button.svelte"
  import PickerSwatch from "../../components/PickerSwatch.svelte"
  import Slider from "../../components/Slider.svelte"

  import browser from "webextension-polyfill"
  
  import type { SettingsList } from "../../types/SettingsProps"
  import { setSettingsValue } from "../../state/SettingsState"
  
  const settings: SettingsList[] = [
    {
      title: "Transparency Effects",
      description: "Enables transparency effects on certain elements such as blur. (May impact battery life)",
      id: 1,
      component: Switch,
      props: {
        state: 'transparencyEffects',
        onChange: (isOn: boolean) => setSettingsValue('transparencyEffects', isOn)
      }
    },
    {
      title: "Animated Background",
      description: "Adds an animated background to BetterSEQTA. (May impact battery life)",
      id: 2,
      component: Switch,
      props: {
        state: 'animatedBackground',
        onChange: (isOn: boolean) => setSettingsValue('animatedBackground', isOn)
      }
    },
    {
      title: "Animated Background Speed",
      description: "Controls the speed of the animated background.",
      id: 3,
      component: Slider,
      props: {
        state: 'animatedBackgroundSpeed',
        onChange: (value: number) => setSettingsValue('animatedBackgroundSpeed', `${value}`)
      }
    },
    {
      title: "Custom Theme Colour",
      description: "Customise the overall theme colour of SEQTA Learn.",
      id: 4,
      component: PickerSwatch
    },
    {
      title: "Telemetry",
      description: "Enables/disables error collecting.",
      id: 5,
      component: Switch,
      props: {
        state: 'telemetry',
        onChange: (isOn: boolean) => setSettingsValue('telemetry', isOn)
      }
    },
    {
      title: "Edit Sidebar Layout",
      description: "Customise the sidebar layout.",
      id: 6,
      component: Button,
      props: {
        onClick: () => browser.runtime.sendMessage({ type: 'currentTab', info: 'EditSidebar' }),
        text: "Edit"
      }
    },
    {
      title: "Notification Collector",
      description: "Uncaps the 9+ limit for notifications, showing the real number.",
      id: 7,
      component: Switch,
      props: {
        state: 'notificationCollector',
        onChange: (isOn: boolean) => setSettingsValue('notificationCollector', isOn)
      }
    },
    {
      title: "Lesson Alerts",
      description: "Sends a native browser notification ~5 minutes prior to lessons.",
      id: 8,
      component: Switch,
      props: {
        state: 'lessonAlerts',
        onChange: (isOn: boolean) => setSettingsValue('lessonAlerts', isOn)
      }
    },
    {
      title: "BetterSEQTA+",
      description: "Enables BetterSEQTA+ features",
      id: 9,
      component: Switch,
      props: {
        state: 'betterSEQTAPlus',
        onChange: (isOn: boolean) => setSettingsValue('betterSEQTAPlus', isOn)
      }
    }
  ];
</script>

<div class="flex flex-col -mt-4 overflow-y-scroll divide-y divide-zinc-100 dark:divide-zinc-700">
  {#each settings as { title, description, component: Component, props, id } (id)}
    <div  class="flex items-center justify-between px-4 py-3">
      <div class="pr-4">
        <h2 class="text-sm font-bold">{title}</h2>
        <p class="text-xs">{description}</p>
      </div>
      <div>
        {#if props?.state !== undefined}
          <svelte:component this={Component} {...props} bind:setting={props.state} />
        {:else}
          <svelte:component this={Component} {...props} />
        {/if}
      </div>
    </div>
  {/each}
</div>