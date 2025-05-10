<script lang="ts">
  // Import components and utilities for background and theme selection
  import BackgroundSelector from "@/interface/components/themes/BackgroundSelector.svelte"
  import ThemeSelector from "@/interface/components/themes/ThemeSelector.svelte"
  import { standalone } from "@/interface/utils/standalone.svelte"
  
  // Declare state variables for selected background, theme clearing function, and edit mode
  let selectedBackground = $state<string | null>(null); // Track the selected background
  let selectNoBackground = $state<() => void>(() => { }); // Function to clear selected background
  
  // Derived state for theme clearing condition
  let clearTheme = $derived(selectedBackground !== null);
  
  // State variable to control whether the settings are in edit mode
  let editMode = $state<boolean>(false);
</script>

<div class="py-4">
  {#if !standalone.standalone} <!-- Only display theme settings if not in standalone mode -->
    <!-- Button to either clear or select a theme -->
    <button
      onclick={() => selectNoBackground()}
      class="w-full px-4 py-2 mb-4 text-[13px] dark:text-white transition rounded-xl bg-zinc-200 dark:bg-zinc-700/50">
      { clearTheme ? 'Clear Theme' : 'Select a Theme' }
    </button>
    <div class="relative w-full">
      <!-- Button to toggle between edit and non-edit modes -->
      <button
        onclick={() => editMode = !editMode}
        class="absolute top-0 right-0 z-10 w-8 h-8 text-lg rounded-xl font-IconFamily bg-zinc-100 dark:bg-zinc-700">
        {editMode ? '\ue9e4' : '\uec38'} <!-- Change icon based on edit mode status -->
      </button>

      <!-- Background and Theme selectors, bound to editMode and selectedBackground -->
      <BackgroundSelector isEditMode={editMode} bind:selectedBackground={selectedBackground} bind:selectNoBackground={selectNoBackground} />
      <ThemeSelector isEditMode={editMode} />
    </div>
  {:else}
    <!-- Message displayed when in standalone mode -->
    <div class="flex items-center justify-center w-full h-full">
      <div class="text-lg">
        Open SEQTA and use the embedded settings to access theme settings. 🫠
      </div>
    </div>
  {/if}
</div>
