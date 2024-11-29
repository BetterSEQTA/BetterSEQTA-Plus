<script lang="ts">
  import { animate } from 'motion';
  import { standalone } from '../utils/standalone.svelte'

  let { state, onChange } = $props<{ state: boolean, onChange: (newState: boolean) => void }>();
  let handle: HTMLElement | null = null;

  const springParams = {
    stiffness: 600,
    damping: 30,
  };

  const animateSwitch = (enabled: boolean) => {
    if (!handle) return;
    animate(
      handle,
      {
        x: enabled ? (standalone.standalone ? 24 : 20) : 0,
      },
      {
        type: 'spring',
        stiffness: springParams.stiffness,
        damping: springParams.damping,
      }
    );
  };

  // Trigger animation whenever state changes
  $effect(() => animateSwitch(state));
</script>

<div
  class="flex w-14 p-1 cursor-pointer transition-all duration-150 rounded-full dark:bg-[#38373D] bg-[#DDDDDD] switch select-none"
  data-ison={state}
  onclick={() => onChange(!state)}
  onkeydown={(e) => e.key === "Enter" && onChange(!state)}
  role="switch"
  aria-checked={state}
  tabindex="0"
>
  <div
    bind:this={handle}
    class="w-6 h-6 bg-white dark:bg-[#FEFEFE] rounded-full drop-shadow-md"
  ></div>
</div>

<style>
  .switch[data-ison="true"] {
    background-color: #30D259;
  }
</style>
