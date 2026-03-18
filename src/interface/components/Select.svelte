<script lang="ts">
  let { state, onChange, options } = $props<{
    state: string,
    onChange: (newState: string) => void,
    options: Array<{ value: string, label: string }>
  }>();

  let select: HTMLSelectElement;
</script>

<div class="select-wrapper relative w-full overflow-hidden rounded-2xl border shadow-2xl">
  <select
    bind:this={select}
    value={state}
    onchange={() => onChange(select.value)}
    class="select-input w-full appearance-none border-none bg-transparent px-4 py-2.5 pr-10 text-[0.875rem] font-medium transition-colors"
  >
    {#each options as option}
      <option value={option.value}>
        {option.label}
      </option>
    {/each}
  </select>
  <span class="select-icon pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" aria-hidden="true">
    <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
      <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"></path>
    </svg>
  </span>
</div>

<style>
  .select-wrapper {
    background: color-mix(in srgb, var(--background-primary) 88%, transparent);
    border-color: color-mix(in srgb, var(--theme-offset-bg, var(--background-secondary)) 72%, transparent);
    border-radius: 18px;
    color: var(--text-primary);
    transition:
      background-color 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease,
      transform 180ms ease;
  }

  .select-wrapper:hover {
    background: color-mix(in srgb, var(--background-primary) 94%, var(--background-secondary) 6%);
    border-color: color-mix(in srgb, var(--theme-offset-bg, var(--background-secondary)) 88%, transparent);
  }

  .select-wrapper:focus-within {
    background: color-mix(in srgb, var(--background-primary) 96%, var(--background-secondary) 4%);
    border-color: color-mix(in srgb, var(--text-primary) 22%, var(--theme-offset-bg, var(--background-secondary)) 78%);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--text-primary) 12%, transparent);
  }

  .select-input {
    color: var(--text-primary);
    outline: none;
    text-overflow: ellipsis;
  }

  .select-input:hover,
  .select-input:focus {
    background: transparent;
  }

  .select-input option {
    background: var(--background-primary);
    color: var(--text-primary);
  }

  .select-icon {
    color: color-mix(in srgb, var(--text-primary) 60%, transparent);
  }

  .select-input {
    color-scheme: light;
  }

  :global(.dark) .select-input {
    color-scheme: dark;
  }
</style>
