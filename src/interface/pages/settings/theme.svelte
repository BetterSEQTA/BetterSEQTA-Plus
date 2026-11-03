<script lang="ts">
  import BackgroundSelector from "@/interface/components/themes/BackgroundSelector.svelte"
  import ThemeSelector from "@/interface/components/themes/ThemeSelector.svelte"
  import Button from "@/interface/components/Button.svelte"
  import CheckIcon from "@lucide/svelte/icons/check"
  import PencilIcon from "@lucide/svelte/icons/pencil"
  import { standalone } from "@/interface/utils/standalone.svelte"

  let { section = "all" }: {
    section?: "all" | "themes" | "backgrounds";
  } = $props();
  
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
      <Button
        onClick={() => selectNoBackground()}
        disabled={section === "backgrounds" && !clearTheme}
        text={section === "all"
          ? clearTheme ? 'Clear Theme' : 'Select a Theme'
          : clearTheme ? 'Clear Background' : 'No Background Selected'}
        class="w-full mb-4"
      />
    {/if}
    <div class="w-full">
      {#if showThemes || showBackgrounds}
        <div class="mb-3 flex justify-end">
          <Button
            onClick={() => editMode = !editMode}
            text={editMode ? 'Done' : 'Remove'}
            icon={editMode ? CheckIcon : PencilIcon}
          />
        </div>
      {/if}

      {#if showBackgrounds}
        <BackgroundSelector isEditMode={editMode} bind:selectedBackground={selectedBackground} bind:selectNoBackground={selectNoBackground} />
      {/if}
      {#if showThemes}
        {#if section === "themes"}
          <Button
            variant="primary"
            class="w-full mb-4"
            text="Open theme builder"
            onClick={() =>
              void import("@/seqta/utils/launchPageThemeBuilder").then(({ launchPageThemeBuilder }) =>
                launchPageThemeBuilder(),
              )}
          />
        {/if}
        <ThemeSelector isEditMode={editMode} showNavigation={section === "all"} />
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
