<script lang="ts">
  import BackgroundSelector from "@/svelte-interface/components/themes/BackgroundSelector.svelte"
  import ThemeSelector from "@/svelte-interface/components/themes/ThemeSelector.svelte"
  
  // backgrounds
  let selectedBackground = $state<string | null>(null);
  let selectNoBackground = $state<() => void>(() => { });
    
  let clearTheme = $derived(selectedBackground !== null);
  let editMode = $state<boolean>(false);
</script>

<div class="py-4">
  <button
    onclick={() => selectNoBackground()}
    class="w-full px-4 py-2 mb-4 text-[13px] dark:text-white transition rounded-xl bg-zinc-200 dark:bg-zinc-700/50">
    { clearTheme ? 'Clear Theme' : 'Select a Theme' }
  </button>
  <div class="relative w-full">
    <!-- edit button -->

    <button
      onclick={() => editMode = !editMode}
      class="absolute top-0 right-0 z-10 w-8 h-8 text-lg rounded-xl font-IconFamily bg-zinc-100 dark:bg-zinc-700">{editMode ? '\ue9e4' : '\uec38'}</button>
    <!-- edit button -->
    <BackgroundSelector isEditMode={editMode} bind:selectedBackground={selectedBackground} bind:selectNoBackground={selectNoBackground} />
    <ThemeSelector isEditMode={editMode} />
  </div>
</div>