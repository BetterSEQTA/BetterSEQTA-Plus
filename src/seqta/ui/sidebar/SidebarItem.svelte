<script lang="ts">
  import { fly } from "svelte/transition";
  import type { SidebarItem } from "./types";

  type Props = {
    item: SidebarItem;
    active: boolean;
    compact: boolean;
    editMode: boolean;
    visible: boolean;
    drillEnter?: boolean;
    onActivate: (item: SidebarItem) => void;
    onToggleVisible?: (key: string, visible: boolean) => void;
    onDragStart?: (key: string) => void;
    onDrop?: (key: string) => void;
  };

  let {
    item,
    active,
    compact,
    editMode,
    visible,
    drillEnter = false,
    onActivate,
    onToggleVisible,
    onDragStart,
    onDrop,
  }: Props = $props();

  const CHEVRON_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><g style="fill: currentcolor;"><path d="M8.578 16.359l4.594-4.594-4.594-4.594 1.406-1.406 6 6-6 6z"></path></g></svg>`;
</script>

<!-- SEQTA class names (item / hasChildren / active) so theme CSS keeps matching. -->
<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<li
  class="item bsplus-sidebar-item"
  class:active={active}
  class:hasChildren={item.hasChildren}
  class:edit-mode={editMode}
  class:hidden-item={editMode && !visible}
  class:compact={compact}
  class:draggable={editMode}
  style:--item-colour={item.itemColour || undefined}
  data-key={item.key}
  data-path={item.path ?? undefined}
  data-betterseqta={item.betterseqta ? "true" : undefined}
  id={item.id ?? undefined}
  role="button"
  tabindex={editMode ? -1 : 0}
  aria-label={item.label}
  aria-current={active ? "page" : undefined}
  draggable={editMode}
  in:fly={{ x: drillEnter ? 24 : 0, duration: 180 }}
  ondragstart={() => onDragStart?.(item.key)}
  ondragover={(e) => e.preventDefault()}
  ondrop={() => onDrop?.(item.key)}
  onclick={() => {
    if (!editMode) onActivate(item);
  }}
  onkeydown={(e) => {
    if (editMode) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate(item);
    }
  }}
>
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
  {#if item.itemColour && !item.hasChildren}
    <span class="colour-bar" aria-hidden="true"></span>
  {/if}
</li>

<style>
  /* Defaults only — theme #menu rules (often !important) win for look.
     Keep folder + leaf rows left-aligned (no 85% centred width). */
  .bsplus-sidebar-item {
    position: relative;
    list-style: none;
    width: auto;
    margin: 2px 6px;
    /* Match leaf vertical spacing so folders don't sit lower than neighbours. */
    padding: 0;
    border-radius: 12px;
    color: var(--text-color, #fff);
    font-family: Rubik, sans-serif;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    transition:
      background-color 0.2s ease,
      transform 0.2s ease,
      opacity 0.2s ease;
    user-select: none;
  }

  .bsplus-sidebar-item > label {
    display: flex;
    align-items: center;
    width: 100%;
    min-width: 0;
    margin: 0;
    padding: 12px;
    cursor: inherit;
    color: inherit;
    font: inherit;
  }

  .bsplus-sidebar-item:hover {
    background: rgba(0, 0, 0, 0.15);
  }

  .bsplus-sidebar-item:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--theme-primary, #fff);
  }

  .bsplus-sidebar-item.active:not(.hasChildren) {
    background: rgba(0, 0, 0, 0.35);
    color: #fff;
  }

  .bsplus-sidebar-item.compact {
    width: auto;
    justify-content: center;
  }

  .bsplus-sidebar-item.compact > label {
    padding: 8px;
    justify-content: center;
  }

  .bsplus-sidebar-item.hidden-item {
    opacity: 0.45;
  }

  .bsplus-sidebar-item.edit-mode {
    cursor: grab;
  }

  .bsplus-sidebar-item :global(label > svg) {
    flex-shrink: 0;
    margin: 0 10px 0 4px;
    width: 28px !important;
    height: 28px !important;
  }

  .compact :global(label > svg) {
    margin: 0;
  }

  .label {
    flex: 1;
    min-width: 0;
    white-space: normal;
    overflow-wrap: anywhere;
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
    margin-right: 12px;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
  }

  .toggle input {
    width: 18px;
    height: 18px;
    accent-color: var(--theme-primary, #fff);
  }

  .colour-bar {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 3px;
    border-radius: 8px 0 0 8px;
    background: var(--item-colour, transparent);
    transition: width 100ms ease;
    pointer-events: none;
  }

  .bsplus-sidebar-item:hover .colour-bar,
  .bsplus-sidebar-item.active .colour-bar {
    width: 6px;
  }
</style>
