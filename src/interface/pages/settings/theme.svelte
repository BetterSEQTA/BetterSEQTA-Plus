<script lang="ts">
  import BackgroundSelector from "@/interface/components/themes/BackgroundSelector.svelte"
  import ThemeSelector from "@/interface/components/themes/ThemeSelector.svelte"
  import { standalone } from "@/interface/utils/standalone.svelte"
  import type { ThemeListMode } from "@/interface/utils/themeListFilters"

  let { section = "all", listMode = "all" } = $props<{
    section?: "all" | "themes" | "backgrounds";
    listMode?: ThemeListMode;
  }>();
  
  // backgrounds
  let selectedBackground = $state<string | null>(null);
  let selectNoBackground = $state<() => void>(() => { });
    
  let clearTheme = $derived(selectedBackground !== null);
  let editMode = $state<boolean>(false);
  let showBackgrounds = $derived(section !== "themes");
  let showThemes = $derived(section !== "backgrounds");
</script>

<div class="py-4">
  {#if !standalone.standalone}
    {#if showBackgrounds}
      <button
        onclick={() => selectNoBackground()}
        disabled={section === "backgrounds" && !clearTheme}
        class="w-full px-4 py-3 mb-4 text-base dark:text-white transition rounded-xl bg-zinc-200 dark:bg-zinc-700/50 disabled:opacity-50">
        {section === "all"
          ? clearTheme ? 'Clear Theme' : 'Select a Theme'
          : clearTheme ? 'Clear Background' : 'No Background Selected'}
      </button>
    {/if}
    <div class="w-full">
      {#if showThemes || showBackgrounds}
        <div class="mb-3 flex justify-end">
          <button
            onclick={() => editMode = !editMode}
            class="inline-flex h-8 items-center rounded-xl bg-zinc-100 px-3 text-lg dark:bg-zinc-700">
            <span class="mr-2">{editMode ? 'Done' : 'Remove'}</span>
            <span class="font-IconFamily">{editMode ? '\ue9e4' : '\uec38'}</span>
          </button>
        </div>
      {/if}

      {#if showBackgrounds}
        <BackgroundSelector isEditMode={editMode} bind:selectedBackground={selectedBackground} bind:selectNoBackground={selectNoBackground} />
      {/if}
      {#if showThemes}
        <ThemeSelector isEditMode={editMode} showNavigation={section === "all"} {listMode} />
      {/if}
    </div>
  {:else}
    <div class="flex justify-center items-center w-full h-full">
      <div class="text-lg">
        Open SEQTA and use the embedded settings to access theme settings. 🫠
      </div>
    </div>
  {/if}
</div>
