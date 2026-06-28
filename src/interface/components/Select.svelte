<script lang="ts">
  let { value, onChange, options } = $props<{
    value: string,
    onChange: (newValue: string) => void,
    options: Array<{ value: string, label: string }>
  }>();

  const listboxId = `select-listbox-${Math.random().toString(36).slice(2, 9)}`;

  let isOpen = $state(false);
  let activeIndex = $state(0);
  let root: HTMLDivElement | undefined = $state();
  let trigger: HTMLButtonElement | undefined = $state();
  let listbox: HTMLDivElement | undefined = $state();

  const selectedLabel = $derived(
    options.find((option) => option.value === value)?.label ?? value,
  );

  const activeDescendantId = $derived(
    isOpen && options[activeIndex] ? optionId(options[activeIndex].value) : undefined,
  );

  function optionId(optionValue: string): string {
    return `${listboxId}-option-${optionValue}`;
  }

  function openMenu(preferredIndex?: number) {
    isOpen = true;
    const selectedIndex = options.findIndex((option) => option.value === value);
    activeIndex = preferredIndex ?? (selectedIndex >= 0 ? selectedIndex : 0);
  }

  function closeMenu(returnFocus = true) {
    isOpen = false;
    if (returnFocus) trigger?.focus();
  }

  function selectValue(nextValue: string) {
    onChange(nextValue);
    closeMenu();
  }

  function moveActive(delta: number) {
    if (!options.length) return;
    activeIndex = (activeIndex + delta + options.length) % options.length;
  }

  function handleKeydown(event: KeyboardEvent, inListbox = false) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        if (isOpen || inListbox) moveActive(delta);
        else openMenu();
        break;
      }
      case "Enter":
      case " ":
        event.preventDefault();
        if (isOpen) {
          const option = options[activeIndex];
          if (option) selectValue(option.value);
        } else {
          openMenu();
        }
        break;
      case "Escape":
        if (isOpen) {
          event.preventDefault();
          closeMenu();
        }
        break;
      case "Home":
        if (inListbox) {
          event.preventDefault();
          activeIndex = 0;
        }
        break;
      case "End":
        if (inListbox) {
          event.preventDefault();
          activeIndex = Math.max(0, options.length - 1);
        }
        break;
      case "Tab":
        if (inListbox) closeMenu(false);
        break;
    }
  }

  $effect(() => {
    if (!isOpen) return;

    queueMicrotask(() => listbox?.focus());

    const onPointerDown = (event: PointerEvent) => {
      if (root && event.composedPath().includes(root)) return;
      closeMenu(false);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  });
</script>

<div class="select-wrapper" bind:this={root}>
  <button
    bind:this={trigger}
    type="button"
    class="select-trigger"
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    aria-controls={listboxId}
    onclick={() => (isOpen ? closeMenu() : openMenu())}
    onkeydown={(event) => handleKeydown(event)}
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
    <div
      bind:this={listbox}
      id={listboxId}
      class="select-menu"
      role="listbox"
      tabindex="-1"
      aria-activedescendant={activeDescendantId}
      onkeydown={(event) => handleKeydown(event, true)}
    >
      {#each options as option, index (option.value)}
        <button
          type="button"
          id={optionId(option.value)}
          role="option"
          aria-selected={option.value === value}
          class="select-option"
          class:is-selected={option.value === value}
          class:is-active={index === activeIndex}
          tabindex="-1"
          onclick={() => selectValue(option.value)}
          onmouseenter={() => (activeIndex = index)}
        >
          {option.label}
        </button>
      {/each}
    </div>
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
    border: 1px solid var(--theme-offset-bg, var(--theme-secondary, #e5e7eb));
    border-radius: 18px;
    background: var(--theme-primary, #ffffff);
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

  .select-trigger:hover,
  .select-trigger:focus-visible {
    outline: none;
    background: var(--theme-secondary, #e5e7eb);
    border-color: var(--theme-offset-bg, var(--theme-secondary, #d4d4d8));
  }

  .select-trigger:focus-visible {
    border-color: color-mix(in srgb, var(--text-primary) 22%, var(--theme-secondary, #e5e7eb) 78%);
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
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    margin: 0;
    padding: 0.5rem;
    border: 1px solid var(--theme-offset-bg, var(--theme-secondary, #e5e7eb));
    border-radius: 14px;
    background: var(--theme-primary, #ffffff);
    box-shadow:
      0 10px 25px -5px rgb(0 0 0 / 0.25),
      0 8px 10px -6px rgb(0 0 0 / 0.2);
    max-height: 18rem;
    overflow-y: auto;
  }

  .select-menu:focus-visible {
    outline: none;
    box-shadow:
      0 10px 25px -5px rgb(0 0 0 / 0.25),
      0 8px 10px -6px rgb(0 0 0 / 0.2),
      0 0 0 1px color-mix(in srgb, var(--text-primary) 12%, transparent);
  }

  .select-option {
    display: block;
    width: 100%;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--text-primary);
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.35;
    text-align: left;
    cursor: pointer;
    transition: background-color 150ms ease;
  }

  .select-option:hover,
  .select-option:focus-visible,
  .select-option.is-active,
  .select-option.is-selected {
    outline: none;
    background: var(--theme-secondary, #e5e7eb);
  }
</style>
