<script lang="ts">
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import { FONT_PRESETS, DEFAULT_FONT_ID, getFontPreset } from "@/seqta/ui/fonts/presets";
  import {
    applySelectedFont,
    buildFontPreviewCss,
    ensureFontPickerFontsLoaded,
  } from "@/seqta/ui/fonts/Manager";
  import { portal } from "@/interface/utils/portal";
  import { syncPageThemeToElement } from "@/interface/utils/syncPageTheme";
  import fontPickerStyles from "./fontPickerModal.css?inline";

  let { hidePicker } = $props<{ hidePicker: () => void }>();

  let rootEl = $state<HTMLElement | null>(null);
  let selectedId = $state(getFontPreset($settingsState.selectedFont).id);
  let styleEl: HTMLStyleElement | null = null;

  function selectFont(id: string) {
    selectedId = id;
    settingsState.selectedFont = id;
    applySelectedFont(id);
  }

  function resetToDefault() {
    selectFont(DEFAULT_FONT_ID);
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) hidePicker();
  }

  function syncTheme() {
    if (rootEl) syncPageThemeToElement(rootEl);
  }

  onMount(() => {
    void ensureFontPickerFontsLoaded();

    styleEl = document.getElementById(
      "betterseqta-font-picker-styles",
    ) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "betterseqta-font-picker-styles";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `${fontPickerStyles}\n${buildFontPreviewCss()}`;

    syncTheme();

    const themeObserver = new MutationObserver(() => syncTheme());
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") hidePicker();
    };

    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      themeObserver.disconnect();
      document.removeEventListener("keydown", handleEscapeKey);
    };
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={rootEl}
  use:portal={document.body}
  class="bsplus-font-picker-overlay bsplus-font-picker-root"
  onclick={handleBackdropClick}
  onkeydown={(event) => {
    if (event.key === "Enter" || event.key === " ") handleBackdropClick(event as unknown as MouseEvent);
  }}
  role="presentation"
  transition:fade={{ duration: 200 }}
>
  <div
    class="bsplus-font-picker-dialog"
    onclick={(event) => event.stopPropagation()}
    onkeydown={(event) => event.stopPropagation()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="font-picker-title"
  >
    <header class="bsplus-font-picker-header">
      <div class="bsplus-font-picker-header-actions">
        <button
          type="button"
          onclick={resetToDefault}
          disabled={selectedId === DEFAULT_FONT_ID}
          class="bsplus-font-picker-reset"
          aria-label="Reset font to default"
        >
          Reset to default
        </button>
        <button
          type="button"
          onclick={hidePicker}
          class="bsplus-font-picker-done"
          aria-label="Close font picker"
        >
          Done
        </button>
      </div>
      <div class="bsplus-font-picker-header-text">
        <h2 id="font-picker-title" class="bsplus-font-picker-title">
          Choose a font
        </h2>
        <p class="bsplus-font-picker-desc">
          Choose a typeface for SEQTA Learn.
        </p>
      </div>
    </header>

    <div class="bsplus-font-picker-list">
      {#each FONT_PRESETS as preset (preset.id)}
        <button
          type="button"
          onclick={() => selectFont(preset.id)}
          class="bsplus-font-picker-option {selectedId === preset.id ? 'is-selected' : ''}"
          data-font-id={preset.id}
        >
          <div class="bsplus-font-picker-option-head">
            <span class="bsplus-font-picker-option-name">{preset.name}</span>
            {#if selectedId === preset.id}
              <span class="bsplus-font-picker-badge">Selected</span>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>
