<script lang="ts">
  import MotionDiv from "./MotionDiv.svelte";
  import LazyPanel from "./LazyPanel.svelte";
  import type { Component } from "svelte";
  import { onMount } from "svelte";

  type TabDef = {
    title: string;
    Content?: Component;
    loader?: () => Promise<{ default: Component }>;
    props?: Record<string, unknown>;
  };

  let { tabs, activeTab = $bindable(0) } = $props<{
    tabs: TabDef[];
    activeTab?: number;
  }>();

  let containerRef: HTMLElement | null = $state(null);
  let tabWidth = $state(0);
  let containerWidth = $state(0);

  const springTransition = { type: "spring", stiffness: 250, damping: 25 };

  function measureTabs() {
    if (!containerRef || tabs.length === 0) return;
    tabWidth = 100 / tabs.length;
    containerRef.style.setProperty("--tab-width", `${tabWidth}%`);
    containerWidth = containerRef.getBoundingClientRect().width;
  }

  const indicatorX = $derived((tabWidth * activeTab * containerWidth) / 100);

  $effect(() => {
    tabs.length;
    if (!containerRef) return;

    measureTabs();
    requestAnimationFrame(measureTabs);

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measureTabs)
        : null;
    ro?.observe(containerRef);

    return () => ro?.disconnect();
  });

  onMount(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "popupClosed") {
        activeTab = 0;
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  });
</script>

<div class="flex flex-col h-full min-h-0">
  <div class="top-0 z-10 shrink-0 text-[0.875rem] pb-0.5 mx-4 px-2 tab-width-container" role="tablist">
    <div bind:this={containerRef} class="flex relative">
      <MotionDiv
        class="absolute top-0 left-0 z-0 h-full bg-gradient-to-tr dark:from-[#38373D]/80 dark:to-[#38373D] from-[#DDDDDD]/80 to-[#DDDDDD] rounded-full opacity-40 tab-width"
        animate={{ x: indicatorX }}
        transition={springTransition}
      />
      {#each tabs as { title }, index}
        <button
          role="tab"
          aria-selected={activeTab === index}
          class="relative z-10 flex-1 px-4 py-2 focus-visible:outline-none"
          onclick={() => (activeTab = index)}
        >
          {title}
        </button>
      {/each}
    </div>
  </div>
  <div class="overflow-hidden px-4 flex-1 min-h-0">
    {#each tabs as tab, index (index)}
      {#if activeTab === index}
        <div
          role="tabpanel"
          class="focus:outline-none w-full h-full min-h-0 pt-2 overflow-y-auto no-scrollbar pb-6 tab active relative"
        >
          <div
            class="sticky top-0 w-full h-3 -mb-3 bg-gradient-to-b from-white/80 dark:from-zinc-800/80 to-transparent pointer-events-none z-[1]"
            aria-hidden="true"
          ></div>
          {#if tab.loader}
            <LazyPanel loader={tab.loader} props={tab.props} />
          {:else if tab.Content}
            <tab.Content {...tab.props} />
          {/if}
        </div>
      {/if}
    {/each}
  </div>
</div>
