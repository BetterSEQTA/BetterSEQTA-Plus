<script lang="ts">
  import { animate, spring } from 'motion';
  import { onMount } from "svelte";

  let { state, onChange } = $props<{ state: boolean, onChange: (newState: boolean) => void }>();
  let handle: HTMLElement | null = null;

  const toggleSwitch = () => {
    onChange(!state);
  };

  const springParams = {
    stiffness: 600,
    damping: 30,
  };

  const animateSwitch = (enabled: boolean) => {
    if (!handle) return;
    animate(
      handle,
      {
        x: enabled ? 20 : 0,
        scaleX: [1, 2, 1]
      },
      {
        easing: spring(springParams),
      }
    );
  };

  // Trigger animation whenever state changes
  $effect(() => animateSwitch(state));

  onMount(() => {
    // Initialize the position of the switch
    animateSwitch(state);
  });
</script>

<div
  class="flex w-14 p-1 cursor-pointer transition rounded-full dark:bg-[#38373D] bg-[#DDDDDD] switch"
  data-ison={state}
  onclick={toggleSwitch}
  onkeydown={(e) => e.key === "Enter" && toggleSwitch()}
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
  .dark .switch[data-ison="true"],
  .switch[data-ison="true"] {
    background-color: #30D259;
  }
</style>
