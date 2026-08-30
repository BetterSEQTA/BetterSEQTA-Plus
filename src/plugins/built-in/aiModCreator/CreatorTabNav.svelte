<script lang="ts">
  type TabId = "create" | "mods" | "settings";

  let {
    tabs,
    activeTab = $bindable("create" as TabId),
    disabled = false,
  }: {
    tabs: { id: TabId; label: string }[];
    activeTab?: TabId;
    disabled?: boolean;
  } = $props();

  const activeIndex = $derived(
    Math.max(
      0,
      tabs.findIndex((tab) => tab.id === activeTab),
    ),
  );
</script>

<div class="tab-nav" aria-label="Creator sections">
  <div class="tab-track" role="tablist">
    <div
      class="tab-indicator"
      style="width: {100 / tabs.length}%; transform: translateX({activeIndex * 100}%)"
      aria-hidden="true"
    ></div>
    {#each tabs as tab (tab.id)}
      <button
        type="button"
        class="tab-button accent-ring"
        role="tab"
        aria-selected={activeTab === tab.id}
        disabled={disabled}
        onclick={() => (activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .tab-nav {
    padding: 12px 16px 0;
    font-size: 0.75rem;
  }

  .tab-track {
    position: relative;
    display: flex;
  }

  .tab-indicator {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    border-radius: 9999px;
    background: linear-gradient(
      to top right,
      rgb(56 55 61 / 0.8),
      rgb(56 55 61)
    );
    opacity: 0.45;
    pointer-events: none;
    transition: transform 380ms cubic-bezier(0.34, 1.45, 0.64, 1);
    will-change: transform;
  }

  .tab-button {
    position: relative;
    z-index: 1;
    flex: 1;
    padding: 8px 12px;
    border: 0;
    border-radius: 9999px;
    background: transparent;
    color: inherit;
    font-size: inherit;
    font-weight: 600;
    transition: opacity 180ms ease;
  }

  .tab-button[aria-selected="true"] {
    color: #f4f4f5;
  }

  .tab-button[aria-selected="false"] {
    opacity: 0.72;
  }

  .tab-button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  @media (prefers-reduced-motion: reduce) {
    .tab-indicator {
      transition: none;
    }
  }
</style>
