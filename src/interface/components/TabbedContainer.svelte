<script lang="ts">
  import MotionDiv from './MotionDiv.svelte';
  import './TabbedContainer.css';
  import { onMount } from 'svelte';

  let { tabs } = $props<{ tabs: { title: string, Content: any, props?: any }[] }>();
  let activeTab = $state(0);
  let hoveredTab = $state<number | null>(null);
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

  $effect(() => {
    calcXPos(hoveredTab);
  });

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
  <div bind:this={containerRef} class="top-0 z-10 text-[0.875rem] pb-0.5 mx-4 tab-width-container">
    <div class="relative flex">
      <MotionDiv
        class="absolute top-0 left-0 z-0 h-full bg-[#DDDDDD] dark:bg-[#38373D] rounded-full opacity-40 tab-width"
        animate={{ x: calcXPos(hoveredTab) }}
        transition={springTransition}
      />
      {#each tabs as { title }, index}
        <button
          class="relative z-10 flex-1 px-4 py-2 focus-visible:outline-none"
          onclick={() => activeTab = index}
          onmouseenter={() => hoveredTab = index}
          onmouseleave={() => hoveredTab = null}
        >
          {title}
        </button>
      {/each}
    </div>
  </div>
  <div class="h-full px-4 overflow-hidden">
    <MotionDiv
      class="h-full"
      animate={{ x: `${-activeTab * 100}%` }}
      transition={springTransition}
    >
      <div class="flex">
        {#each tabs as { Content, props }, index}
          <div class="absolute focus:outline-none w-full transition-opacity duration-300 overflow-y-scroll no-scrollbar h-full tab {activeTab === index ? 'opacity-100 active' : 'opacity-0'}"
            style="left: {index * 100}%;">
             <Content {...props} />
          </div>
        {/each}
      </div>
    </MotionDiv>
  </div>
</div>