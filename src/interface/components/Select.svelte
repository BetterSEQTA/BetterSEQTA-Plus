<script lang="ts">
  let { value, onChange, options } = $props<{
    value: string,
    onChange: (newValue: string) => void,
    options: Array<{ value: string, label: string }>
  }>();

  const listboxId = `select-listbox-${Math.random().toString(36).slice(2, 9)}`;

  let isOpen = $state(false);
  let activeIndex = $state(0);
  let trigger = $state<HTMLButtonElement>();

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

  function onKeydown(event: KeyboardEvent, inListbox = false) {
    const { key } = event;

    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      const count = options.length;
      if (!count) return;
      if (isOpen || inListbox) {
        activeIndex = (activeIndex + (key === "ArrowDown" ? 1 : -1) + count) % count;
      } else {
        openMenu();
      }
      return;
    }

    if (key === "Enter" || key === " ") {
      event.preventDefault();
      if (isOpen) {
        const option = options[activeIndex];
        if (option) selectValue(option.value);
      } else {
        openMenu();
      }
      return;
    }

    if (key === "Escape" && isOpen) {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (!inListbox) return;

    if (key === "Home") {
      event.preventDefault();
      activeIndex = 0;
    } else if (key === "End") {
      event.preventDefault();
      activeIndex = Math.max(0, options.length - 1);
    } else if (key === "Tab") {
      closeMenu(false);
    }
  }

  $effect(() => {
    if (!isOpen) return;

    queueMicrotask(() => document.getElementById(listboxId)?.focus());

    const wrapper = trigger?.parentElement;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapper && event.composedPath().includes(wrapper)) return;
      closeMenu(false);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  });
</script>

<div class="select relative w-full">
  <button
    bind:this={trigger}
    type="button"
    class="select-trigger flex w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-2.5 text-sm font-medium leading-tight shadow-2xl transition-[background-color,border-color,box-shadow] duration-200 cursor-pointer"
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    aria-controls={listboxId}
    onclick={() => (isOpen ? closeMenu() : openMenu())}
    onkeydown={onKeydown}
  >
    <span class="truncate">
      {options.find((option) => option.value === value)?.label ?? value}
    </span>
    <span class="select-icon shrink-0" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
          clip-rule="evenodd"
        />
      </svg>
    </span>
  </button>

  {#if isOpen}
    <div
      id={listboxId}
      class="select-menu absolute inset-x-0 top-[calc(100%+0.35rem)] z-50 flex max-h-72 flex-col gap-0.5 p-2"
      role="listbox"
      tabindex="-1"
      aria-activedescendant={options[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined}
      onkeydown={(event) => onKeydown(event, true)}
    >
      {#each options as option, index (option.value)}
        <button
          type="button"
          id={`${listboxId}-opt-${index}`}
          role="option"
          aria-selected={option.value === value}
          class="select-option block w-full rounded-[10px] border-none px-3.5 py-2.5 text-left text-sm font-medium leading-snug transition-colors duration-150 cursor-pointer"
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
  .select {
    --sel-border: var(--theme-offset-bg, var(--theme-secondary, #e5e7eb));
    --sel-bg: var(--theme-primary, #ffffff);
    --sel-surface: var(--theme-secondary, #e5e7eb);
    --sel-focus-border: color-mix(in srgb, var(--text-primary) 22%, var(--theme-secondary, #e5e7eb) 78%);
    --sel-ring: 0 0 0 1px color-mix(in srgb, var(--text-primary) 12%, transparent);
    --sel-menu-shadow:
      0 10px 25px -5px rgb(0 0 0 / 0.25),
      0 8px 10px -6px rgb(0 0 0 / 0.2);
  }

  .select-trigger {
    border-color: var(--sel-border);
    background: var(--sel-bg);
    color: var(--text-primary);
  }

  .select-trigger:hover,
  .select-trigger:focus-visible {
    outline: none;
    background: var(--sel-surface);
    border-color: var(--sel-border);
  }

  .select-trigger:focus-visible {
    border-color: var(--sel-focus-border);
    box-shadow: var(--sel-ring);
  }

  .select-icon {
    color: color-mix(in srgb, var(--text-primary) 60%, transparent);
  }

  .select-menu {
    border: 1px solid var(--sel-border);
    border-radius: 14px;
    background: var(--sel-bg);
    box-shadow: var(--sel-menu-shadow);
  }

  .select-menu:focus-visible {
    outline: none;
    box-shadow: var(--sel-menu-shadow), var(--sel-ring);
  }

  .select-option {
    background: transparent;
    color: var(--text-primary);
  }

  .select-option:hover,
  .select-option:focus-visible,
  .select-option.is-active,
  .select-option.is-selected {
    outline: none;
    background: var(--sel-surface);
  }
</style>
