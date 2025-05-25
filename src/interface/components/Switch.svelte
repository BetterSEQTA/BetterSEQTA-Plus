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
  class="flex w-14 p-1 cursor-pointer transition-all duration-150 rounded-full bg-gradient-to-tr select-none shadow-2xl ring-[1px] ring-[#DDDDDD]/30 dark:ring-[#38373D]/30 {state ? 'to-[#30D259]/80 from-[#30D259] dark:from-[#30D259]/40 dark:to-[#30D259]' : 'dark:from-[#38373D]/50 dark:to-[#38373D] to-[#DDDDDD]/50 from-[#DDDDDD]'}"
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