<script>
	import { settingsState } from '../state/SettingsState.ts';
  import { animate, spring } from 'motion';
  import './Switch.css'
  import { onMount } from "svelte"
  import { delay } from "../../seqta/utils/delay"

  export let setting;
  export let onChange = () => {}

  const toggleSwitch = () => {
    const newIsOn = !$settingsState[setting]
    onChange(newIsOn)
  }

  const springParams = {
    type: 'spring',
    stiffness: 700,
    damping: 30,
  }

  let handle;

  const animation = (enabled) => {
    if (handle) {
      animate(
        handle,
        {
          x: enabled ? 24 : 0,
        },
        {
          easing: spring({ stiffness: 500, damping: 30 })
        }
      )
    }
  }

  $: ((enabled) => {
      if (handle) {
        animate(
          handle,
          { x: enabled ? 24 : 0 },
          { easing: spring({ stiffness: 500, damping: 30 }) }
        )
      }
    })($settingsState[setting])

</script>

<div
  id={setting}
  class="flex w-14 p-1 cursor-pointer transition rounded-full dark:bg-[#38373D] bg-[#DDDDDD] switch"
  data-ison={$settingsState[setting]}
  on:click={toggleSwitch}
  on:keydown={(e) => e.key === "Enter" && toggleSwitch()}
  role="switch"
  aria-checked={$settingsState[setting]}
  tabindex="0"
>
  <div
    bind:this={handle}
    class="w-6 h-6 bg-white dark:bg-[#FEFEFE] rounded-full drop-shadow-md"
  />
</div>