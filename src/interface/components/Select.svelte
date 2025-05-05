<script lang="ts">
  let { state, onChange, options } = $props<{
    state: string,
    onChange: (newState: string) => void,
    options: Array<{ value: string, label: string }>
  }>();

  let select: HTMLSelectElement;
</script>

<div class="bg-gradient-to-tr dark:to-[#38373D]/80 dark:from-[#38373D]/90 from-[#DDDDDD] to-[#DDDDDD]/80 rounded-lg w-full overflow-clip">
  <select
    bind:this={select}
    value={state}
    onchange={() => onChange(select.value)}
    class="px-4 py-1 text-[0.75rem] dark:text-white w-full border-none bg-transparent focus:ring-0 focus:bg-white/20 dark:focus:bg-black/10"
  >
    {#each options as option}
      <option value={option.value}>
        {option.label}
      </option>
    {/each}
  </select>
</div>
