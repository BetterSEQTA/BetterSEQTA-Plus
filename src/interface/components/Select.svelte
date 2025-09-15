<script lang="ts">
  let { state, onChange, options } = $props<{
    state: string,
    onChange: (newState: string) => void,
    options: Array<{ value: string, label: string }>
  }>();

  let select: HTMLSelectElement;
</script>

<div class="border dark:bg-[#38373D]/50 bg-[#DDDDDD]/50 border-[#DDDDDD]/30 dark:border-[#38373D]/30 shadow-2xl rounded-xl w-full overflow-clip">
  <select
    bind:this={select}
    value={state}
    onchange={() => onChange(select.value)}
    class="px-4 py-2 pr-9 text-[0.875rem] font-medium text-black dark:text-white w-full border-none bg-white/80 dark:bg-zinc-800/70 hover:bg-white/90 dark:hover:bg-zinc-800/80 focus:bg-white/90 dark:focus:bg-zinc-800/80 focus:ring-0 rounded-md appearance-none transition-colors"
  >
    {#each options as option}
      <option value={option.value}>
        {option.label}
      </option>
    {/each}
  </select>
</div>

<style>
  /* Make native dropdown list readable on Windows */
  select option {
    background-color: #ffffff;
    color: #111827; /* zinc-900 */
  }
  :global(.dark) select option {
    background-color: #1f2937; /* zinc-800 */
    color: #ffffff;
  }

  :global(.dark) div::after {
    color: rgba(255, 255, 255, 0.6);
  }
</style>
