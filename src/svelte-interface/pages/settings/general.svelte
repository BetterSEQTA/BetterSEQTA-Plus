<script lang="ts">
  import Switch from "../../components/Switch.svelte"
  import Button from "../../components/Button.svelte"
  //import PickerSwatch from "../../components/PickerSwatch.svelte"
  import Slider from "../../components/Slider.svelte"

  import browser from "webextension-polyfill"
  
  import type { SettingsList } from "../../types/SettingsProps"
  import { createSettingsState } from "../../state/SettingsStore.svelte.ts"

  const settingsStore = createSettingsState();

  let test = $state(false);

  const settings: SettingsList[] = [
    {
      title: "Transparency Effects",
      description: "Enables transparency effects on certain elements such as blur. (May impact battery life)",
      id: 1,
      Component: Switch,
      props: {
        /* state: $settingsStore.transparencyEffects,
        onChange: (isOn: boolean) => settingsStore.setKey('transparencyEffects', isOn) */
        state: test,
        onChange: (isOn: boolean) => test = isOn
      }
    },
    {
      title: "Animated Background",
      description: "Adds an animated background to BetterSEQTA. (May impact battery life)",
      id: 2,
      Component: Switch as any,
      props: {
        state: $settingsStore.animatedbk,
        onChange: (isOn: boolean) => settingsStore.setKey('animatedbk', isOn)
      }
    },
    {
      title: "Animated Background Speed",
      description: "Controls the speed of the animated background.",
      id: 3,
      Component: Slider,
      props: {
        state: $settingsStore.bksliderinput,
        onChange: (value: number) => settingsStore.setKey('bksliderinput', `${value}`)
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
        state: $settingsStore.notificationcollector,
        onChange: (isOn: boolean) => settingsStore.setKey('notificationcollector', isOn)
      }
    },
    {
      title: "Lesson Alerts",
      description: "Sends a native browser notification ~5 minutes prior to lessons.",
      id: 8,
      Component: Switch,
      props: {
        state: $settingsStore.lessonalert,
        onChange: (isOn: boolean) => settingsStore.setKey('lessonalert', isOn)
      }
    },
    {
      title: "BetterSEQTA+",
      description: "Enables BetterSEQTA+ features",
      id: 9,
      Component: Switch,
      props: {
        state: $settingsStore.onoff,
        onChange: (isOn: boolean) => settingsStore.setKey('onoff', isOn)
      }
    }
  ];
</script>

<div class="flex flex-col -mt-4 overflow-y-scroll divide-y divide-zinc-100 dark:divide-zinc-700">
  <Switch state={$settingsStore.DarkMode} onChange={(isOn: boolean) => settingsStore.setKey('DarkMode', isOn)} />
  {#if settings}
    {#each settings as { title, description, Component, props, id } (id)}
      <div  class="flex items-center justify-between px-4 py-3">
        <div class="pr-4">
          <h2 class="text-sm font-bold">{title}</h2>
          <p class="text-xs">{description}</p>
        </div>
        <div>
          <Component {...props} />
        </div>
      </div>
    {/each}
  {/if}
</div>