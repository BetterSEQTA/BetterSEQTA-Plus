<script lang="ts">
  import MotionDiv from './MotionDiv.svelte';
  import './TabbedContainer.css';
  import { onMount } from 'svelte';

  let { tabs, activeTab = $bindable(0) } = $props<{ tabs: { title: string, Content: any, props?: any }[]; activeTab?: number }>();
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

<div class="flex flex-col h-full min-h-0">
  <div class="top-0 z-10 shrink-0 text-[0.875rem] pb-0.5 mx-4 px-2 tab-width-container" role="tablist">
    <div bind:this={containerRef} class="flex relative">
      <MotionDiv
        class="absolute top-0 left-0 z-0 h-full bg-gradient-to-tr dark:from-[#38373D]/80 dark:to-[#38373D] from-[#DDDDDD]/80 to-[#DDDDDD] rounded-full opacity-40 tab-width"
        animate={{ x: calcXPos(activeTab) }}
        transition={springTransition}
      />
      {#each tabs as { title }, index}
        <button
          role="tab"
          aria-selected={activeTab === index}
          class="relative z-10 flex-1 px-4 py-2 focus-visible:outline-none"
          onclick={() => activeTab = index}
        >
          {title}
        </button>
      {/each}
    </div>
  </div>
  <div class="overflow-hidden px-4 flex-1 min-h-0">
    {#each tabs as { Content, props }, index (index)}
      {#if activeTab === index}
        <div
          role="tabpanel"
          class="focus:outline-none w-full h-full min-h-0 pt-2 overflow-y-auto no-scrollbar pb-6 tab active relative"
        >
          <div
            class="sticky top-0 w-full h-3 -mb-3 bg-gradient-to-b from-white/80 dark:from-zinc-800/80 to-transparent pointer-events-none z-[1]"
            aria-hidden="true"
          ></div>
          <Content {...props} />
        </div>
      {/if}
    {/each}
  </div>
</div>
