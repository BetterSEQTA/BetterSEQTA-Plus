<script lang="ts">
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import SidebarNavItem from "./SidebarNavItem.svelte";

  type NavGroup = {
    label?: string;
    items: {
      id: string;
      label: string;
      divided?: boolean;
      nested?: boolean;
      expanded?: boolean;
    }[];
  };

  let { groups, selectedId, onselect } = $props<{
    groups: NavGroup[];
    selectedId: string;
    onselect: (id: string) => void;
  }>();

  let trackEl = $state<HTMLElement | null>(null);
  let indicatorX = $state(0);
  let indicatorY = $state(0);
  let indicatorW = $state(0);
  let indicatorH = $state(40);
  let indicatorReady = $state(false);

  const updateIndicator = () => {
    if (!trackEl) return;
    const item = trackEl.querySelector<HTMLElement>(`[data-nav-section="${selectedId}"]`);
    if (!item) return;
    const trackRect = trackEl.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    indicatorX = itemRect.left - trackRect.left;
    indicatorY = itemRect.top - trackRect.top + trackEl.scrollTop;
    indicatorW = itemRect.width;
    indicatorH = itemRect.height;
    indicatorReady = true;
  };

  $effect(() => {
    selectedId;
    groups;
    trackEl;
    queueMicrotask(updateIndicator);
  });
</script>

<div
  class="relative flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto no-scrollbar"
  bind:this={trackEl}
>
  {#if indicatorReady}
    <div
      class="pointer-events-none absolute left-0 top-0 z-0 rounded-lg bg-zinc-200/90 dark:bg-zinc-700/90"
      style="transform: translate({indicatorX}px, {indicatorY}px); width: {indicatorW}px; height: {indicatorH}px; transition: {$settingsState.animations
        ? 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), width 0.28s cubic-bezier(0.22, 1, 0.36, 1), height 0.28s cubic-bezier(0.22, 1, 0.36, 1)'
        : 'none'};"
    ></div>
  {/if}

  {#each groups as group}
    <div class="relative flex flex-col gap-1">
      {#if group.label}
        <p
          class="relative z-10 mb-1.5 px-3 text-sm font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500"
        >
          {group.label}
        </p>
      {/if}
      {#each group.items as item (item.id)}
        {#if item.divided}
          <div class="my-2 border-t border-zinc-200 dark:border-zinc-700 {item.nested ? 'ml-4' : ''}"></div>
        {/if}
        <SidebarNavItem
          label={item.label}
          active={selectedId === item.id}
          nested={item.nested}
          emphasized={item.expanded}
          trackId={item.id}
          onclick={() => onselect(item.id)}
        />
      {/each}
    </div>
  {/each}
</div>
