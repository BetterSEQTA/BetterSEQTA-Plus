<script lang="ts">
  import type { SidebarItem } from "./types";

  type Props = {
    item: SidebarItem;
    active: boolean;
    compact: boolean;
    editMode: boolean;
    visible: boolean;
    /** Reserved — panel slide handles enter motion; no per-item fly. */
    drillEnter?: boolean;
    onActivate: (item: SidebarItem) => void;
    onToggleVisible?: (key: string, visible: boolean) => void;
  };

  let {
    item,
    active,
    compact,
    editMode,
    visible,
    drillEnter: _drillEnter = false,
    onActivate,
    onToggleVisible,
  }: Props = $props();

  const CHEVRON_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><g style="fill: currentcolor;"><path d="M8.578 16.359l4.594-4.594-4.594-4.594 1.406-1.406 6 6-6 6z"></path></g></svg>`;
  const GRIP_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="5" cy="3" r="1.35" fill="currentColor"/><circle cx="11" cy="3" r="1.35" fill="currentColor"/><circle cx="5" cy="8" r="1.35" fill="currentColor"/><circle cx="11" cy="8" r="1.35" fill="currentColor"/><circle cx="5" cy="13" r="1.35" fill="currentColor"/><circle cx="11" cy="13" r="1.35" fill="currentColor"/></svg>`;
</script>

<!-- Keep SEQTA's structural attributes so existing themes recognize each row. -->
<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<li
  class="item bsplus-sidebar-item"
  class:bsplus-active={active}
  class:hasChildren={item.hasChildren}
  class:edit-mode={editMode}
  class:hidden-item={editMode && !visible}
  class:compact={compact}
  class:draggable={editMode}
  style:--item-colour={item.itemColour || undefined}
  data-colour={item.itemColour || undefined}
  data-key={item.key}
  data-path={item.path ?? undefined}
  data-betterseqta={item.betterseqta ? "true" : undefined}
  id={item.id ?? undefined}
  role="button"
  tabindex={editMode ? -1 : 0}
  aria-label={item.label}
  aria-current={active ? "page" : undefined}
  onclick={(e) => {
    // Keep SEQTA's #menu handlers from seeing custom-list clicks — that fights
    // our drill UI and can freeze the tab (Goals / Folios / etc.).
    e.preventDefault();
    e.stopPropagation();
    if (!editMode) onActivate(item);
  }}
  onkeydown={(e) => {
    if (editMode) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      onActivate(item);
    }
  }}
>
  {#if editMode}
    <span class="drag-grip" aria-hidden="true">{@html GRIP_SVG}</span>
  {/if}
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label>
    {#if item.iconHtml}
      <!-- svelte-ignore a11y_distracting_elements -->
      {@html item.iconHtml}
    {/if}
    <span class="label">{item.label}</span>
    {#if item.hasChildren && !compact && !editMode}
      <span class="chevron" aria-hidden="true">{@html CHEVRON_SVG}</span>
    {/if}
  </label>
  {#if editMode}
    <label class="toggle">
      <input
        type="checkbox"
        checked={visible}
        onclick={(e) => e.stopPropagation()}
        onchange={(e) =>
          onToggleVisible?.(
            item.key,
            (e.currentTarget as HTMLInputElement).checked,
          )}
      />
    </label>
  {/if}
</li>

<style>
  /* Layout defaults — theme #menu rules (often !important) win for look. */
  .bsplus-sidebar-item {
    position: relative;
    list-style: none;
    width: auto;
    margin: 2px 6px;
    padding: 0;
    border-radius: 12px;
    color: var(--text-color, #fff);
    cursor: pointer;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    transition:
      background-color 0.2s ease,
      box-shadow 0.2s ease,
      opacity 0.2s ease;
    user-select: none;
  }

  .bsplus-sidebar-item > label:not(.toggle) {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    width: auto;
    min-width: 0;
    margin: 0;
    padding: 12px;
    cursor: inherit;
    color: inherit;
  }

  .bsplus-sidebar-item:hover:not(.bsplus-active) {
    background: rgba(0, 0, 0, 0.15);
  }

  .bsplus-sidebar-item:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--theme-primary, #fff);
  }

  .bsplus-sidebar-item.bsplus-active:not(.hasChildren),
  .bsplus-sidebar-item.bsplus-active:not(.hasChildren):hover {
    background: rgba(0, 0, 0, 0.35);
    color: #fff;
  }

  .bsplus-sidebar-item.compact {
    justify-content: center;
  }

  .bsplus-sidebar-item.compact > label:not(.toggle) {
    padding: 8px;
    justify-content: center;
  }

  .bsplus-sidebar-item.hidden-item {
    opacity: 0.45;
  }

  .bsplus-sidebar-item.edit-mode {
    cursor: grab;
    gap: 0;
  }

  .bsplus-sidebar-item.edit-mode:active {
    cursor: grabbing;
  }

  /* Keep the same label padding/size as normal items; only reserve toggle space. */
  .bsplus-sidebar-item.edit-mode > label:not(.toggle) {
    flex: 1 1 auto;
    width: auto;
    min-width: 0;
    padding: 12px;
    padding-left: 4px;
  }

  .drag-grip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 20px;
    margin-left: 10px;
    opacity: 0.45;
    color: inherit;
    pointer-events: none;
  }

  .bsplus-sidebar-item.edit-mode:hover .drag-grip {
    opacity: 0.8;
  }

  .bsplus-sidebar-item :global(label > svg) {
    flex-shrink: 0;
  }

  .compact :global(label > svg) {
    margin: 0;
  }

  .label {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
  }

  .compact .label,
  .compact .chevron {
    display: none;
  }

  .chevron {
    display: inline-flex;
    flex-shrink: 0;
    margin-left: auto;
    opacity: 0.85;
  }

  .chevron :global(svg) {
    width: 24px;
    height: 24px;
  }

  .toggle {
    margin: 0 10px 0 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex: 0 0 auto;
    width: auto;
    padding: 0;
    position: relative;
    z-index: 2;
  }

  .toggle input {
    width: 18px;
    height: 18px;
    margin: 0;
    flex-shrink: 0;
    accent-color: var(--theme-primary, #fff);
  }
</style>
