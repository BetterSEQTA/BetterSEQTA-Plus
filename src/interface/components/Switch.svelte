<script lang="ts">
  import { onMount } from "svelte";
  import { standalone } from '../utils/standalone.svelte';
  import { fullMotionEffectsEnabled } from '@/seqta/utils/performanceMode';

  let { state: checked, onChange } = $props<{ state: boolean, onChange: (newState: boolean) => void }>();

  let motionReady = $state(false);
  onMount(() => {
    // Paint the hydrated position before enabling transitions for later toggles.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => { motionReady = true; });
    });
    return () => cancelAnimationFrame(frame);
  });

  const knobX = $derived(checked ? (standalone.standalone ? 24 : 20) : 0);
</script>

<div
  class="flex w-14 p-1 cursor-pointer transition-all duration-150 rounded-full bg-gradient-to-tr select-none shadow-2xl ring-[1px] ring-[#DDDDDD]/30 dark:ring-[#38373D]/30 {checked ? 'to-[#30D259]/80 from-[#30D259] dark:from-[#30D259]/40 dark:to-[#30D259]' : 'dark:from-[#38373D]/50 dark:to-[#38373D] to-[#DDDDDD]/50 from-[#DDDDDD]'}"
  onclick={() => onChange(!checked)}
  onkeydown={(e) => e.key === "Enter" && onChange(!checked)}
  role="switch"
  aria-checked={checked}
  tabindex="0"
>
  <div
    class="w-6 h-6 bg-white dark:bg-[#FEFEFE] rounded-full drop-shadow-md transition-transform duration-200"
    style={`transform: translateX(${knobX}px); transition-duration: ${motionReady && fullMotionEffectsEnabled() ? 200 : 0}ms`}
  ></div>
</div>

<style>
  @media (prefers-reduced-motion: reduce) {
    [role="switch"] > div { transition: none !important; }
  }
</style>
