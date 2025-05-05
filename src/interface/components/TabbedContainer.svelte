<script lang="ts">
  import MotionDiv from './MotionDiv.svelte';
  import './TabbedContainer.css';
  import { onMount } from 'svelte';

  let { tabs } = $props<{ tabs: { title: string, Content: any, props?: any }[] }>();
  let activeTab = $state(0);
  let containerRef: HTMLElement | null = null;
  let tabWidth = $state(0);

  const springTransition = { type: 'spring', stiffness: 250, damping: 25 };

  const updateTabWidth = () => {
    tabWidth = tabs.length > 0 ? 100 / tabs.length : 0;
    if (!containerRef) return;
    containerRef.style.setProperty('--tab-width', `${tabWidth}%`);
  };

  const calcXPos = (index: number | null) => {
    if (containerRef) {
      return tabWidth * (index !== null ? index : activeTab) * containerRef.getBoundingClientRect().width / 100;
    }
    return 0;
  };

  onMount(() => {
    updateTabWidth();

    const handleMessage = (event: MessageEvent) => {
      if (event.data === "popupClosed") {
        activeTab = 0;
      }
    };
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  });
</script>

<div class="flex flex-col h-full">
  <div class="top-0 z-10 text-[0.875rem] pb-0.5 mx-4 px-2 tab-width-container">
    <div bind:this={containerRef} class="flex relative">
      <MotionDiv
        class="absolute top-0 left-0 z-0 h-full bg-gradient-to-tr dark:from-[#38373D]/80 dark:to-[#38373D] from-[#DDDDDD]/80 to-[#DDDDDD] rounded-full opacity-40 tab-width"
        animate={{ x: calcXPos(activeTab) }}
        transition={springTransition}
      />
      {#each tabs as { title }, index}
        <button
          class="relative z-10 flex-1 px-4 py-2 focus-visible:outline-none"
          onclick={() => activeTab = index}
        >
          {title}
        </button>
      {/each}
    </div>
  </div>
  <div class="overflow-hidden px-4 h-full">
    <MotionDiv
      class="h-full"
      animate={{ x: `${-activeTab * 100}%` }}
      transition={springTransition}
    >
      <div class="flex">
        {#each tabs as { Content, props }, index}
        <div class="absolute focus:outline-none w-full pt-2 transition-opacity duration-300 overflow-y-scroll no-scrollbar pb-2 h-full tab {activeTab === index ? 'opacity-100 active' : 'opacity-0'}"
          style="left: {index * 100}%;">
          <div style="left: {index * 100}%;" class="fixed top-0 w-full h-8 bg-gradient-to-b to-transparent pointer-events-none z-[100] from-white dark:from-zinc-800 dark:to-transparent"></div>
             <Content {...props} />
          </div>
        {/each}
      </div>
    </MotionDiv>
  </div>
</div>
