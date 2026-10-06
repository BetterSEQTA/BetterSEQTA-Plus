<script lang="ts">
  import LazyPanel from "./LazyPanel.svelte";
  import type { Component } from "svelte";
  import { onMount } from "svelte";
  import { fullMotionEffectsEnabled } from "@/seqta/utils/performanceMode";

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
    <div class="flex relative">
      <div
        class="absolute top-0 left-0 z-0 h-full bg-gradient-to-tr dark:from-[#38373D]/80 dark:to-[#38373D] from-[#DDDDDD]/80 to-[#DDDDDD] rounded-full opacity-40 tab-width"
        style={`width: ${100 / Math.max(1, tabs.length)}%; transform: translateX(${activeTab * 100}%); transition: transform ${fullMotionEffectsEnabled() ? 250 : 0}ms cubic-bezier(0.22, 1, 0.36, 1)`}
      ></div>
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
  <div class="relative overflow-hidden px-4 flex-1 min-h-0">
    <div
      class="tab-scroll-fade absolute inset-x-4 top-0 h-3 bg-gradient-to-b from-white/80 dark:from-zinc-800/80 to-transparent pointer-events-none z-[1]"
      aria-hidden="true"
    ></div>
    {#each tabs as tab, index (index)}
      {#if activeTab === index}
        <div
          role="tabpanel"
          class="focus:outline-none w-full h-full min-h-0 pt-2 overflow-y-auto no-scrollbar pb-6 tab active relative"
        >
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

<style>
  @media (prefers-reduced-motion: reduce) {
    .tab-width { transition: none !important; }
  }
</style>
