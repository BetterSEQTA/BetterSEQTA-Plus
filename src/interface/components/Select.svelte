<script lang="ts">
  // Destructure props: state (selected value), onChange (change handler), options (dropdown options)
  let { state, onChange, options } = $props<{
    state: string,
    onChange: (newState: string) => void,
    options: Array<{ value: string, label: string }>
  }>();

  let select: HTMLSelectElement; // Reference to the select element
</script>

<!--
  Container for the styled dropdown.
  - Uses gradient backgrounds and rounded corners.
  - Applies light/dark mode styles and ensures full width layout.
-->
<div class="bg-gradient-to-tr dark:to-[#38373D]/80 dark:from-[#38373D]/90 from-[#DDDDDD] to-[#DDDDDD]/80 rounded-lg w-full overflow-clip">
  <select
    bind:this={select} // Bind select element to `select` variable
    value={state} // Set selected value
    onchange={() => onChange(select.value)} // Trigger callback on change
    class="px-4 py-1 text-[0.75rem] dark:text-white w-full border-none bg-transparent focus:ring-0 focus:bg-white/20 dark:focus:bg-black/10"
  >
    {#each options as option}
      <!-- Render each option with corresponding value and label -->
      <option value={option.value}>
        {option.label}
      </option>
    {/each}
  </select>
</div>
