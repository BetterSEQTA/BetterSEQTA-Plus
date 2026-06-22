<script lang="ts">
  let { value, onChange, options } = $props<{
    value: string,
    onChange: (newValue: string) => void,
    options: Array<{ value: string, label: string }>
  }>();

  let isOpen = $state(false);
  let root: HTMLDivElement | undefined = $state();

  const selectedLabel = $derived(
    options.find((option) => option.value === value)?.label ?? value,
  );

  function toggleOpen() {
    isOpen = !isOpen;
  }

  function selectValue(nextValue: string) {
    onChange(nextValue);
    isOpen = false;
  }

  $effect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const path = event.composedPath();
      if (root && path.includes(root)) return;
      isOpen = false;
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  });
</script>

<div class="select-wrapper" bind:this={root}>
  <button
    type="button"
    class="select-trigger"
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    onclick={toggleOpen}
  >
    <span class="select-label">{selectedLabel}</span>
    <span class="select-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
          clip-rule="evenodd"
        ></path>
      </svg>
    </span>
  </button>

  {#if isOpen}
    <ul class="select-menu" role="listbox">
      {#each options as option (option.value)}
        <li role="option" aria-selected={option.value === value}>
          <button
            type="button"
            class="select-option"
            class:is-selected={option.value === value}
            onclick={() => selectValue(option.value)}
          >
            {option.label}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .select-wrapper {
    position: relative;
    width: 100%;
  }

  .select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    border: 1px solid color-mix(in srgb, var(--theme-offset-bg, var(--background-secondary)) 72%, transparent);
    border-radius: 18px;
    background: color-mix(in srgb, var(--background-primary) 88%, transparent);
    color: var(--text-primary);
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25;
    cursor: pointer;
    box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
    transition:
      background-color 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease;
  }

  .select-trigger:hover {
    background: color-mix(in srgb, var(--background-primary) 94%, var(--background-secondary) 6%);
    border-color: color-mix(in srgb, var(--theme-offset-bg, var(--background-secondary)) 88%, transparent);
  }

  .select-trigger:focus-visible {
    outline: none;
    background: color-mix(in srgb, var(--background-primary) 96%, var(--background-secondary) 4%);
    border-color: color-mix(in srgb, var(--text-primary) 22%, var(--theme-offset-bg, var(--background-secondary)) 78%);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--text-primary) 12%, transparent);
  }

  .select-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .select-icon {
    flex-shrink: 0;
    color: color-mix(in srgb, var(--text-primary) 60%, transparent);
  }

  .select-menu {
    position: absolute;
    top: calc(100% + 0.35rem);
    left: 0;
    right: 0;
    z-index: 50;
    margin: 0;
    padding: 0.35rem;
    list-style: none;
    border: 1px solid color-mix(in srgb, var(--theme-offset-bg, var(--background-secondary)) 72%, transparent);
    border-radius: 14px;
    background: var(--background-primary);
    box-shadow:
      0 10px 25px -5px rgb(0 0 0 / 0.25),
      0 8px 10px -6px rgb(0 0 0 / 0.2);
    max-height: 16rem;
    overflow-y: auto;
  }

  .select-option {
    display: block;
    width: 100%;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--text-primary);
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: background-color 150ms ease;
  }

  .select-option:hover,
  .select-option:focus-visible {
    outline: none;
    background: color-mix(in srgb, var(--background-secondary) 55%, transparent);
  }

  .select-option.is-selected {
    background: color-mix(in srgb, var(--background-secondary) 70%, transparent);
  }
</style>
