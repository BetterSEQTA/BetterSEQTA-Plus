<script lang="ts">
  let { state, onChange, options } = $props<{
    state: string,
    onChange: (newState: string) => void,
    options: Array<{ value: string, label: string }>
  }>();

  let select: HTMLSelectElement;
</script>

<div class="relative border dark:bg-[#38373D]/50 bg-[#DDDDDD]/50 border-[#DDDDDD]/30 dark:border-[#38373D]/30 shadow-2xl rounded-xl w-full overflow-clip">
  <select
    bind:this={select}
    value={state}
    onchange={() => onChange(select.value)}
    class="px-4 py-2 pr-10 text-[0.875rem] font-medium text-black dark:text-white w-full border-none bg-white/80 dark:bg-zinc-800/70 hover:bg-white/90 dark:hover:bg-zinc-800/80 focus:bg-white/90 dark:focus:bg-zinc-800/80 focus:ring-0 rounded-md appearance-none transition-colors"
  >
    {#each options as option}
      <option value={option.value}>
        {option.label}
      </option>
    {/each}
  </select>
  <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-black/45 dark:text-white/60" aria-hidden="true">
    <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
      <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"></path>
    </svg>
  </span>
</div>

<style>
  select {
    color-scheme: light;
  }

  :global(.dark) select {
    color-scheme: dark;
  }

  select option {
    background-color: #ffffff;
    color: #111827;
  }

  :global(.dark) select option {
    background-color: #1f2937;
    color: #ffffff;
  }
</style>
