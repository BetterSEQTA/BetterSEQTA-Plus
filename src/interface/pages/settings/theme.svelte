<script lang="ts">
  import BackgroundSelector from "@/interface/components/themes/BackgroundSelector.svelte"
  import ThemeSelector from "@/interface/components/themes/ThemeSelector.svelte"
  import { standalone } from "@/interface/utils/standalone.svelte"
  
  // backgrounds
  let selectedBackground = $state<string | null>(null);
  let selectNoBackground = $state<() => void>(() => { });
    
  let clearTheme = $derived(selectedBackground !== null);
  let editMode = $state<boolean>(false);
</script>

<div class="py-4">
  {#if !standalone.standalone}
    <button
      onclick={() => selectNoBackground()}
      class="w-full px-4 py-2 mb-4 text-[13px] dark:text-white transition rounded-xl bg-zinc-200 dark:bg-zinc-700/50">
      { clearTheme ? 'Clear Theme' : 'Select a Theme' }
    </button>
    <div class="relative w-full">
      <button
        onclick={() => editMode = !editMode}
        class="absolute top-0 right-0 z-10 w-8 h-8 text-lg rounded-xl font-IconFamily bg-zinc-100 dark:bg-zinc-700">{editMode ? '\ue9e4' : '\uec38'}</button>

      <BackgroundSelector isEditMode={editMode} bind:selectedBackground={selectedBackground} bind:selectNoBackground={selectNoBackground} />
      <ThemeSelector isEditMode={editMode} />
    </div>
  {:else}
    <div class="flex items-center justify-center w-full h-full">
      <div class="text-lg">
        Open SEQTA and use the embedded settings to access theme settings. 🫠
      </div>
    </div>
  {/if}
</div>