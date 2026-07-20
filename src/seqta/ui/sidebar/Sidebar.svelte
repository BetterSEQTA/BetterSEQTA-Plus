<script lang="ts">
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import {
    restoreCustomMenuActive,
    sidebarState,
  } from "./sidebarState.svelte";
  import SidebarItem from "./SidebarItem.svelte";
  import type {
    SidebarDrillFrame,
    SidebarItem as SidebarItemModel,
  } from "./types";

  type Props = {
    menuEl: HTMLElement;
  };

  let { menuEl }: Props = $props();

  let dragKey = $state<string | null>(null);
  let coverEl: HTMLElement | null = null;

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

  function onDragStart(key: string) {
    dragKey = key;
  }

  function onDrop(key: string) {
    if (dragKey && sidebarState.editMode) {
      sidebarState.reorderRoot(dragKey, key);
    }
    dragKey = null;
  }

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

  // SEQTA strips `.active` from `#menu li` after clicks — re-apply from state.
  // Do NOT MutationObserver class changes here: restore writes `.active`, SEQTA
  // strips it again, and the feedback loop freezes the tab.
  $effect(() => {
    void sidebarState.activeKey;
    void sidebarState.isDrilling;
    restoreCustomMenuActive();
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
  class:compact={sidebarState.compact}
  class:edit-mode={sidebarState.editMode}
  aria-label="Main"
>
  {#if sidebarState.editMode}
    <li class="item bsplus-sidebar-edit-header" aria-hidden="true">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label><span class="label">Edit Sidebar</span></label>
    </li>
    {#each sidebarState.items as item (item.key)}
      <SidebarItem
        {item}
        active={sidebarState.activeKey === item.key}
        compact={sidebarState.compact}
        editMode={true}
        visible={itemVisible(item.key)}
        {onActivate}
        {onToggleVisible}
        {onDragStart}
        {onDrop}
      />
    {/each}
    <li class="item bsplus-sidebar-edit-actions">
      <button
        type="button"
        class="edit-btn"
        onclick={() => sidebarState.restoreDefaultOrder()}
      >
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
    class:active={true}
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
        if (e.target === e.currentTarget) {
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
          onclick={() => sidebarState.goBack()}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
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
    width: 85%;
    margin: 12px auto 16px;
    padding: 0;
    list-style: none;
    cursor: default;
  }

  .edit-btn {
    flex: 1;
    padding: 10px 12px;
    border: none;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.2);
    color: inherit;
    font: inherit;
    font-weight: 700;
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
</style>
