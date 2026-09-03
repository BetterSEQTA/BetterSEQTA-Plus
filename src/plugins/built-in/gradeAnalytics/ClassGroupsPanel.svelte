<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import type { AnalyticsClassGroup, AnalyticsClassOption } from "./types";
  import { animationsEnabled } from "@/seqta/utils/performanceMode";

  type Props = {
    classOptions: AnalyticsClassOption[];
    groups: AnalyticsClassGroup[];
    activeGroupId: string | null;
    onSelectGroup: (group: AnalyticsClassGroup | null) => void;
    onSaveGroups: (groups: AnalyticsClassGroup[]) => void;
  };

  let { classOptions, groups, activeGroupId, onSelectGroup, onSaveGroups }: Props = $props();

  let showEditor = $state(false);
  let groupName = $state("");
  let draftClassKeys = $state<string[]>([]);
  let editingId = $state<string | null>(null);

  const fadeDuration = $derived(animationsEnabled() ? 180 : 0);
  const optionByKey = $derived(new Map(classOptions.map((option) => [option.key, option])));

  function classLabel(key: string): string {
    const option = optionByKey.get(key);
    return option ? `${option.title} (${option.yearLabel})` : key;
  }

  function defaultGroupName(keys: string[]): string {
    if (!keys.length) return "";
    const labels = keys.map(classLabel);
    if (labels.length === 1) return labels[0]!;
    return `${labels[0]} + ${labels.length - 1} more`;
  }

  function openCreate() {
    editingId = null;
    const active = groups.find((g) => g.id === activeGroupId);
    draftClassKeys = active?.classKeys.length
      ? [...active.classKeys]
      : classOptions.slice(0, Math.min(2, classOptions.length)).map((option) => option.key);
    groupName = defaultGroupName(draftClassKeys);
    showEditor = true;
  }

  function openEdit(group: AnalyticsClassGroup) {
    editingId = group.id;
    groupName = group.name;
    draftClassKeys = [...group.classKeys];
    showEditor = true;
  }

  function cancelEditor() {
    showEditor = false;
    editingId = null;
    groupName = "";
    draftClassKeys = [];
  }

  function toggleDraftClass(key: string) {
    draftClassKeys = draftClassKeys.includes(key)
      ? draftClassKeys.filter((entry) => entry !== key)
      : [...draftClassKeys, key];
  }

  function saveGroup() {
    if (!draftClassKeys.length) return;

    if (editingId) {
      onSaveGroups(
        groups.map((g) =>
          g.id === editingId
            ? { ...g, name: groupName.trim() || g.name, classKeys: [...draftClassKeys] }
            : g,
        ),
      );
    } else {
      const created: AnalyticsClassGroup = {
        id: crypto.randomUUID(),
        name: groupName.trim() || defaultGroupName(draftClassKeys),
        classKeys: [...new Set(draftClassKeys)],
      };
      onSaveGroups([...groups, created]);
      onSelectGroup(created);
    }
    cancelEditor();
  }

  function deleteGroup(id: string) {
    onSaveGroups(groups.filter((g) => g.id !== id));
    if (activeGroupId === id) onSelectGroup(null);
  }

  function onModalKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditor();
    }
  }
</script>

<svelte:window onkeydown={showEditor ? onModalKeydown : undefined} />

<div class="bsplus-analytics-filter-group bsplus-analytics-class-groups">
  <div class="bsplus-analytics-class-groups-head">
    <span class="bsplus-analytics-field-label">Combined classes</span>
    <button
      type="button"
      class="bsplus-analytics-class-groups-add"
      onclick={openCreate}
      disabled={!classOptions.length}
    >
      Combine
    </button>
  </div>

  {#if groups.length}
    <ul class="bsplus-analytics-class-groups-list" role="list">
      {#each groups as group (group.id)}
        {@const active = activeGroupId === group.id}
        <li class="bsplus-analytics-class-group-row">
          <button
            type="button"
            class="bsplus-analytics-class-group-btn"
            class:is-active={active}
            onclick={() => onSelectGroup(active ? null : group)}
            title={group.classKeys.map(classLabel).join(", ")}
          >
            <span class="bsplus-analytics-class-group-name">{group.name}</span>
            <span class="bsplus-analytics-class-group-meta"
              >{group.classKeys.length} class{group.classKeys.length === 1 ? "" : "es"}</span
            >
          </button>
          <button
            type="button"
            class="bsplus-analytics-class-group-icon"
            aria-label="Edit {group.name}"
            onclick={() => openEdit(group)}
          >
            ✎
          </button>
          <button
            type="button"
            class="bsplus-analytics-class-group-icon bsplus-analytics-class-group-delete"
            aria-label="Delete {group.name}"
            onclick={() => deleteGroup(group.id)}
          >
            ×
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="bsplus-analytics-class-groups-empty">
      Save classes from any year to view their combined grades in one trend.
    </p>
  {/if}
</div>

{#if showEditor}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="bsplus-analytics-class-groups-modal"
    role="presentation"
    transition:fade={{ duration: fadeDuration }}
    onclick={(e) => {
      if (e.target === e.currentTarget) cancelEditor();
    }}
  >
    <div
      class="bsplus-analytics-class-groups-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bsplus-class-group-modal-title"
      transition:scale={{ duration: fadeDuration, start: 0.96 }}
      onclick={(e) => e.stopPropagation()}
    >
      <header class="bsplus-analytics-class-groups-dialog-head">
        <div>
          <h2 id="bsplus-class-group-modal-title" class="bsplus-analytics-class-groups-dialog-title">
            {editingId ? "Edit combined classes" : "Combine classes"}
          </h2>
          <p class="bsplus-analytics-class-groups-dialog-desc">
            Every class from every programme year — same folders as Courses.
          </p>
        </div>
        <button
          type="button"
          class="bsplus-analytics-class-groups-close"
          aria-label="Close"
          onclick={cancelEditor}
        >
          ×
        </button>
      </header>

      <div class="bsplus-analytics-class-groups-dialog-body">
        <label class="bsplus-analytics-class-groups-field">
          <span class="bsplus-analytics-field-label">Group name</span>
          <input
            type="text"
            class="bsplus-analytics-input"
            bind:value={groupName}
            placeholder="e.g. English block"
          />
        </label>

        <div class="bsplus-analytics-class-groups-field">
          <span class="bsplus-analytics-field-label">
            Classes ({draftClassKeys.length} selected)
          </span>
          <div
            class="bsplus-analytics-class-groups-picks"
            role="group"
            aria-label="Classes in this group"
          >
            {#each classOptions as option (option.key)}
              {@const picked = draftClassKeys.includes(option.key)}
              <label class="bsplus-analytics-class-groups-pick">
                <input
                  type="checkbox"
                  checked={picked}
                  onchange={() => toggleDraftClass(option.key)}
                />
                <span class="bsplus-analytics-class-groups-check" aria-hidden="true">
                  {#if picked}✓{/if}
                </span>
                <span class="bsplus-analytics-class-groups-pick-text">
                  <span class="bsplus-analytics-class-groups-pick-label">{option.title}</span>
                  <span class="bsplus-analytics-class-groups-year">{option.yearLabel}</span>
                </span>
              </label>
            {/each}
          </div>
        </div>
      </div>

      <footer class="bsplus-analytics-class-groups-dialog-actions">
        <button type="button" class="bsplus-analytics-btn" onclick={cancelEditor}>
          Cancel
        </button>
        <button
          type="button"
          class="bsplus-analytics-btn bsplus-analytics-btn-primary"
          disabled={!draftClassKeys.length}
          onclick={saveGroup}
        >
          {editingId ? "Save changes" : "Create group"}
        </button>
      </footer>
    </div>
  </div>
{/if}
