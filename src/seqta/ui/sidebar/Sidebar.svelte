<script lang="ts">
  import { onDestroy } from "svelte";
  import Sortable from "sortablejs";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import { sidebarState } from "./sidebarState.svelte";
  import SidebarItem from "./SidebarItem.svelte";
  import type {
    SidebarDrillFrame,
    SidebarItem as SidebarItemModel,
  } from "./types";

  type Props = {
    menuEl: HTMLElement;
  };

  let { menuEl }: Props = $props();

  let listEl = $state<HTMLElement | null>(null);
  let coverEl: HTMLElement | null = null;
  let sortable: Sortable | null = null;
  let dragging = $state(false);

  const BACK_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><g style="fill: currentcolor;"><path d="M15.422 16.078l-1.406 1.406-6-6 6-6 1.406 1.406-4.594 4.594z"></path></g></svg>`;

  function itemVisible(key: string): boolean {
    return (
      (settingsState.menuitems as Record<string, { toggle?: boolean }>)[key]
        ?.toggle !== false
    );
  }

  function onActivate(item: SidebarItemModel) {
    sidebarState.activateItem(item, menuEl);
  }

  function closeEdit() {
    sidebarState.setEditMode(false);
    void import("@/seqta/utils/Openers/menuOptionsState").then((mod) => {
      mod.setMenuOptionsOpen(false);
    });
  }

  const drillFolders = $derived(
    sidebarState.drillStack.map((frame) => ({
      frame,
      folder: sidebarState.findByKey(frame.key),
    })),
  );

  function onToggleVisible(key: string, visible: boolean) {
    sidebarState.setItemVisibility(key, visible);
  }

  function destroySortable() {
    sortable?.destroy();
    sortable = null;
    dragging = false;
    document.documentElement.style.removeProperty("--bsplus-drag-width");
  }

  function syncSortableFromState() {
    if (!sortable || dragging) return;
    const order = sidebarState.editRootItems.map((item) => item.key);
    sortable.sort(order, true);
  }

  function restoreDefault() {
    sidebarState.restoreDefaultOrder();
    queueMicrotask(syncSortableFromState);
  }

  $effect(() => {
    const editing = sidebarState.editMode;
    const list = listEl;

    destroySortable();
    if (!editing || !list) return;

    sortable = Sortable.create(list, {
      animation: 220,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      draggable: ".bsplus-sidebar-item.draggable",
      filter: ".toggle, .toggle input, .bsplus-sidebar-edit-header, .bsplus-sidebar-edit-actions",
      preventOnFilter: false,
      dataIdAttr: "data-key",
      ghostClass: "bsplus-sortable-ghost",
      chosenClass: "bsplus-sortable-chosen",
      dragClass: "bsplus-sortable-drag",
      forceFallback: true,
      fallbackOnBody: true,
      fallbackTolerance: 3,
      swapThreshold: 0.65,
      direction: "vertical",
      onStart: (evt) => {
        dragging = true;
        const width = evt.item.getBoundingClientRect().width;
        document.documentElement.style.setProperty(
          "--bsplus-drag-width",
          `${Math.round(width)}px`,
        );
        // Fallback clone is created just after onStart; pin size + drop
        // Active styling makes fallback clones wider; keep the source width.
        requestAnimationFrame(() => {
          const dragEl = document.querySelector(
            ".bsplus-sortable-drag",
          ) as HTMLElement | null;
          if (!dragEl) return;
          dragEl.style.width = `${Math.round(width)}px`;
          dragEl.style.maxWidth = `${Math.round(width)}px`;
          dragEl.classList.remove("bsplus-active");
        });
      },
      onEnd: (evt) => {
        dragging = false;
        document.documentElement.style.removeProperty("--bsplus-drag-width");
        if (evt.from !== evt.to) return;
        if (evt.oldIndex == null || evt.newIndex == null) return;
        if (evt.oldIndex === evt.newIndex) return;
        sidebarState.applyMenuOrder(sortable?.toArray() ?? []);
      },
    });

    return () => {
      destroySortable();
    };
  });

  $effect(() => {
    const editing = sidebarState.editMode;
    const container = document.getElementById("container");

    if (editing && container && !coverEl) {
      const cover = document.createElement("div");
      cover.className = "notMenuCover bsplus-sidebar-edit-cover";
      cover.addEventListener("click", closeEdit);
      container.appendChild(cover);
      menuEl.style.zIndex = "20";
      menuEl.classList.add("bsplus-sidebar-edit-mode");
      coverEl = cover;
    }

    if (!editing) {
      coverEl?.remove();
      coverEl = null;
      menuEl.style.removeProperty("z-index");
      menuEl.classList.remove("bsplus-sidebar-edit-mode");
    }

    return () => {
      coverEl?.remove();
      coverEl = null;
      menuEl.style.removeProperty("z-index");
    };
  });

  // Drill `.sub` is position:absolute inside this scrollport — if the list was
  // scrolled down (e.g. Folios/Goals near the bottom), the panel sits under the
  // logo until we reset. Also reset when going back up the stack.
  $effect(() => {
    void sidebarState.drillStack.length;
    void sidebarState.enterFrameKey;
    const root = document.getElementById("bsplus-sidebar-root");
    if (!root) return;
    root.scrollTop = 0;
    requestAnimationFrame(() => {
      root.scrollTop = 0;
    });
  });

  onDestroy(() => {
    destroySortable();
    coverEl?.remove();
    coverEl = null;
  });
</script>

<!--
  Direct `#menu > ul.logo-link` child so theme selectors like
  `#menu > ul > li.item` / `#menu .sub` / `:has(> ul > li.hasChildren.active)` match.
-->
<ul
  id="bsplus-sidebar-root"
  class="logo-link bsplus-sidebar-list"
  class:noscroll={sidebarState.isDrilling}
  class:drilling={sidebarState.isDrilling}
  class:drill-entering={sidebarState.enterFrameKey != null}
  class:drill-returning={sidebarState.drillReturning}
  class:compact={sidebarState.compact}
  class:edit-mode={sidebarState.editMode}
  class:is-sorting={dragging}
  aria-label="Main"
  bind:this={listEl}
>
  {#if sidebarState.editMode}
    <li class="item bsplus-sidebar-edit-header" aria-hidden="true">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label><span class="label">Edit Sidebar</span></label>
    </li>
    {#each sidebarState.editRootItems as item (item.key)}
      <SidebarItem
        {item}
        active={sidebarState.activeKey === item.key}
        compact={false}
        editMode={true}
        visible={itemVisible(item.key)}
        {onActivate}
        {onToggleVisible}
      />
    {/each}
    <li class="item bsplus-sidebar-edit-actions">
      <button type="button" class="edit-btn" onclick={restoreDefault}>
        Restore Default
      </button>
      <button type="button" class="edit-btn primary" onclick={closeEdit}>
        Save
      </button>
    </li>
  {:else if drillFolders.length}
    <!-- Keep root rows in the DOM so sidebar-animation.scss can slide siblings.
         Never mark root leaves active while drilling — theme decorations
         (Beach palm/sand) would show through the transparent .sub panel. -->
    {#each sidebarState.visibleRootItems as item (item.key)}
      {#if item.key === drillFolders[0].frame.key}
        {@render drillLevel(drillFolders, 0)}
      {:else}
        <SidebarItem
          {item}
          active={false}
          compact={false}
          editMode={false}
          visible={true}
          {onActivate}
        />
      {/if}
    {/each}
  {:else}
    {#each sidebarState.visibleRootItems as item (item.key)}
      <SidebarItem
        {item}
        active={sidebarState.activeKey === item.key}
        compact={sidebarState.compact}
        editMode={false}
        visible={true}
        {onActivate}
      />
    {/each}
  {/if}
</ul>

{#snippet drillLevel(
  frames: Array<{ frame: SidebarDrillFrame; folder: SidebarItemModel | null }>,
  depth: number,
)}
  {@const current = frames[depth]}
  {@const isLast = depth === frames.length - 1}
  {@const nextKey = isLast ? null : frames[depth + 1].frame.key}
  {@const folder = current.folder}
  <li
    class="item hasChildren bsplus-sidebar-item"
    class:bsplus-active={true}
    data-key={current.frame.key}
    data-path={folder?.path ?? undefined}
    style:--item-colour={folder?.itemColour || undefined}
  >
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label>
      {#if folder?.iconHtml}
        {@html folder.iconHtml}
      {/if}
      <span class="label">{current.frame.label}</span>
    </label>
    <div
      class="sub"
      class:bsplus-sub-enter={sidebarState.enterFrameKey === current.frame.key}
      onanimationend={(e) => {
        if (e.target !== e.currentTarget) return;
        if (sidebarState.enterFrameKey === current.frame.key) {
          sidebarState.clearEnterFrame(current.frame.key);
        }
      }}
    >
      <div class="nav">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="back"
          role="button"
          tabindex="0"
          aria-label="Back"
          onclick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            sidebarState.goBack();
          }}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              sidebarState.goBack();
            }
          }}
        >
          {@html BACK_SVG}
          <div class="backLabel">{current.frame.label}</div>
        </div>
      </div>
      <ul>
        {#if isLast}
          {#each current.frame.items as item (item.key)}
            <SidebarItem
              {item}
              active={sidebarState.activeKey === item.key}
              compact={false}
              editMode={false}
              visible={true}
              drillEnter={sidebarState.enterFrameKey === current.frame.key}
              {onActivate}
            />
          {/each}
        {:else}
          {#each current.frame.items as item (item.key)}
            {#if item.key === nextKey}
              {@render drillLevel(frames, depth + 1)}
            {:else}
              <SidebarItem
                {item}
                active={sidebarState.activeKey === item.key}
                compact={false}
                editMode={false}
                visible={true}
                {onActivate}
              />
            {/if}
          {/each}
        {/if}
      </ul>
    </div>
  </li>
{/snippet}

<style>
  .bsplus-sidebar-list {
    list-style: none;
    margin: 0;
    padding: 0 0 16px;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    box-sizing: border-box;
    color: var(--text-color, #fff);
    scrollbar-width: thin;
    z-index: 2;
  }

  .bsplus-sidebar-list.noscroll,
  .bsplus-sidebar-list.drilling {
    overflow: hidden;
  }

  .bsplus-sidebar-list.compact {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .bsplus-sidebar-list.is-sorting {
    cursor: grabbing;
    user-select: none;
  }

  .bsplus-sidebar-edit-header {
    pointer-events: none;
    width: 85%;
    margin: 8px auto 4px;
    font-weight: 700;
    font-size: 16px;
  }

  .bsplus-sidebar-edit-header > label {
    display: block;
    padding: 12px 16px 4px;
  }

  .bsplus-sidebar-edit-actions {
    display: flex;
    gap: 8px;
    width: calc(100% - 12px);
    margin: 12px 6px 16px;
    padding: 0;
    list-style: none;
    cursor: default;
    box-sizing: border-box;
  }

  .edit-btn {
    flex: 1 1 0;
    min-width: 0;
    padding: 10px 8px;
    border: none;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.2);
    color: inherit;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      transform 0.2s ease;
  }

  .edit-btn:hover {
    background: rgba(0, 0, 0, 0.32);
    transform: scale(1.02);
  }

  .edit-btn:active {
    transform: scale(0.98);
  }

  .edit-btn.primary {
    background: rgba(0, 0, 0, 0.4);
  }

  /* SortableJS classes (applied to our items; must be :global). */
  .bsplus-sidebar-list :global(.bsplus-sortable-ghost) {
    opacity: 0.35 !important;
    background: rgba(255, 255, 255, 0.08) !important;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
  }

  .bsplus-sidebar-list :global(.bsplus-sortable-chosen) {
    background: rgba(0, 0, 0, 0.28) !important;
  }

  .bsplus-sidebar-list :global(.bsplus-sortable-drag),
  :global(.bsplus-sortable-drag) {
    opacity: 1 !important;
    cursor: grabbing !important;
    z-index: 10000 !important;
    width: var(--bsplus-drag-width, 240px) !important;
    max-width: var(--bsplus-drag-width, 240px) !important;
    box-sizing: border-box !important;
    box-shadow:
      0 14px 32px rgba(0, 0, 0, 0.35),
      0 0 0 1px rgba(255, 255, 255, 0.12) !important;
    transform: scale(1.03);
    background: rgba(0, 0, 0, 0.45) !important;
  }
</style>
