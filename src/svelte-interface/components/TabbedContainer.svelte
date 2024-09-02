<script>
  import { MotionDiv } from 'svelte-motion';
  import { onMount, onDestroy } from 'svelte';
  import { writable, derived } from 'svelte/store';
  import './TabbedContainer.css';

  export let tabs = [];

  let activeTab = writable(0);
  const hoveredTab = writable(null);
  const position = writable(0);
  let tabWidth = 0;
  let containerRef;

  const springTransition = { type: 'spring', stiffness: 250, damping: 25 };

  // Calculate tabWidth dynamically based on tabs length
  onMount(() => {
    if (containerRef) {

      tabWidth = 100 / tabs.length;
      document.documentElement.style.setProperty('--tab-width', `${tabWidth}%`);

      calcXPos = (index) => tabWidth * (index !== null ? index : $activeTab) * (containerRef !== null ? containerRef.getBoundingClientRect().width : 0) / 100;
    }

    // Listen for messages
    const handleMessage = (event) => {
      if (event.data === "popupClosed") {
        activeTab.set(0);
      }
    };
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  });

  let calcXPos = (index) => tabWidth * (index !== null ? index : $activeTab);
</script>

<div bind:this={containerRef} class="top-0 z-10 text-[0.875rem] pb-0.5 mx-4">
  <div class="hidden tab-width"></div>
  <div class="relative flex">
    <MotionDiv
      class="absolute top-0 left-0 z-0 h-full bg-[#DDDDDD] dark:bg-[#38373D] tab-width rounded-full opacity-40"
      animate={{ x: calcXPos($hoveredTab) }}
      transition={springTransition}
    />
    {#each tabs as { title }, index}
      <button
        class="relative z-10 flex-1 px-4 py-2"
        on:click={() => activeTab.set(index)}
        on:mouseenter={() => hoveredTab.set(index)}
        on:mouseleave={() => hoveredTab.set(null)}
      >
        {title}
      </button>
    {/each}
  </div>
</div>
<div class="h-full px-4 overflow-y-scroll overflow-x-clip">
  <MotionDiv
    animate={{ x: `${-$activeTab * 100}%` }}
    transition={springTransition}
  >
    <div class="flex">
      {#each tabs as { content }, index}
      <div class="absolute w-full transition-opacity duration-300 pb-4 {$activeTab === index ? 'opacity-100' : 'opacity-0'}"
        style="left: {index * 100}%;">
        <svelte:component this={content} />
      </div>
      {/each}
    </div>
  </MotionDiv>
</div>

<style>
  :root {
    --tab-width: 0px;
  }
</style>