<script lang="ts">
  let { state, onChange, options } = $props<{
    state: string,
    onChange: (newState: string) => void,
    options: Array<{ value: string, label: string }>
  }>();

  let select: HTMLSelectElement;
</script>

<select
  bind:this={select}
  value={state}
  onchange={() => onChange(select.value)}
  class="px-4 py-1 text-[0.75rem] dark:bg-[#38373D] bg-[#DDDDDD] dark:text-white rounded-md w-full"
>
  {#each options as option}
    <option value={option.value}>
      {option.label}
    </option>
  {/each}
</select>
