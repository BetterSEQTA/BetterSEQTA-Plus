<script lang="ts">
  // Import motion for animation and a utility to detect standalone mode
  import { animate } from 'motion';
  import { standalone } from '../utils/standalone.svelte'

  // Props: state (on/off) and callback for state change
  let { state, onChange } = $props<{ state: boolean, onChange: (newState: boolean) => void }>();
  
  // Reference to the switch handle DOM element
  let handle: HTMLElement | null = null;

  // Spring animation configuration
  const springParams = {
    stiffness: 600,
    damping: 30,
  };

  // Animate handle movement based on switch state
  const animateSwitch = (enabled: boolean) => {
    if (!handle) return;
    animate(
      handle,
      {
        // Move to 24px if standalone mode, otherwise 20px; 0 if disabled
        x: enabled ? (standalone.standalone ? 24 : 20) : 0,
      },
      {
        type: 'spring',
        stiffness: springParams.stiffness,
        damping: springParams.damping,
      }
    );
  };

  // Reactively animate whenever `state` changes
  $effect(() => animateSwitch(state));
</script>

<!--
  Switch component container
  - Visually styled as a toggle.
  - Responds to click and keyboard Enter key to toggle state.
-->
<div
  class="flex w-14 p-1 cursor-pointer transition-all duration-150 rounded-full bg-gradient-to-tr dark:from-[#38373D]/50 dark:to-[#38373D] to-[#DDDDDD]/50 from-[#DDDDDD] switch select-none"
  data-ison={state}
  onclick={() => onChange(!state)}
  onkeydown={(e) => e.key === 'Enter' && onChange(!state)}
  role="switch"
  aria-checked={state}
  tabindex="0"
>
  <!-- Switch handle -->
  <div
    bind:this={handle}
    class="w-6 h-6 bg-white dark:bg-[#FEFEFE] rounded-full drop-shadow-md"
  ></div>
</div>

<style>
  /* Light mode: green gradient background when switch is on */
  .switch[data-ison="true"] {
    @apply to-[#30D259]/80 from-[#30D259];
  }

  /* Dark mode: green gradient background when switch is on */
  .dark .switch[data-ison="true"] {
    @apply from-[#30D259]/40 to-[#30D259];
  }
</style>
