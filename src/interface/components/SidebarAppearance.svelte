<script lang="ts">
  import Select from "@/interface/components/Select.svelte";
  import Slider from "@/interface/components/Slider.svelte";
  import Switch from "@/interface/components/Switch.svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import {
    DEFAULT_SIDEBAR_BLUR,
    DEFAULT_SIDEBAR_RADIUS,
    getSidebarStyle,
    normalizeSidebarBlur,
    normalizeSidebarDensity,
    normalizeSidebarIndicator,
    normalizeSidebarRadius,
    normalizeSidebarStyleId,
    normalizeSidebarWidth,
    SIDEBAR_STYLES,
    type SidebarStyleId,
  } from "@/seqta/ui/sidebar/sidebarStyles";

  const PREVIEW_ITEMS = [
    { label: "Home", active: true },
    { label: "Timetable", active: false },
    { label: "Assessments", active: false },
    { label: "Messages", active: false },
    { label: "Documents", active: false },
  ] as const;

  const selectedId = $derived(
    normalizeSidebarStyleId($settingsState.sidebarStyle),
  );
  const selected = $derived(getSidebarStyle(selectedId));
  const density = $derived(
    normalizeSidebarDensity($settingsState.sidebarDensity),
  );
  const indicator = $derived(
    normalizeSidebarIndicator($settingsState.sidebarActiveIndicator),
  );
  const width = $derived(normalizeSidebarWidth($settingsState.sidebarWidth));
  const radius = $derived(
    normalizeSidebarRadius(
      $settingsState.sidebarCornerRadius ?? DEFAULT_SIDEBAR_RADIUS,
    ),
  );
  const blur = $derived(
    normalizeSidebarBlur($settingsState.sidebarBlur ?? DEFAULT_SIDEBAR_BLUR),
  );
  const transparencyOn = $derived($settingsState.transparencyEffects === true);

  function selectStyle(id: SidebarStyleId) {
    if (selectedId !== id) settingsState.sidebarStyle = id;
  }
</script>

<div class="card">
  <header class="card-header split">
    <div>
      <h2 class="title">Sidebar Style</h2>
      <p class="subtitle">Choose how the navigation menu looks</p>
    </div>
    <div class="selected-meta" aria-live="polite">
      <span class="selected-label">{selected.label}</span>
      <span class="selected-desc">{selected.description}</span>
    </div>
  </header>

  <div class="picker-body">
    <div class="preview-pane" aria-hidden="true">
      <div class={`preview style-${selectedId}`}>
        <div class="preview-chrome">
          <div class="preview-logo"></div>
          {#each PREVIEW_ITEMS as item (item.label)}
            <div class="preview-item" class:active={item.active}>
              <span class="preview-dot"></span>
              <span class="preview-label">{item.label}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div
      class="options"
      role="listbox"
      tabindex="0"
      aria-label="Sidebar styles"
      aria-activedescendant={`sidebar-style-${selectedId}`}
    >
      {#each SIDEBAR_STYLES as style (style.id)}
        {@const active = style.id === selectedId}
        <button
          type="button"
          id={`sidebar-style-${style.id}`}
          class="option"
          class:active
          role="option"
          aria-selected={active}
          onclick={() => selectStyle(style.id)}
        >
          <div class={`thumb style-${style.id}`}>
            <div class="thumb-chrome">
              {#each PREVIEW_ITEMS.slice(0, 3) as item (item.label)}
                <div class="thumb-item" class:active={item.active}></div>
              {/each}
            </div>
          </div>
          <span class="option-label">{style.label}</span>
        </button>
      {/each}
    </div>
  </div>
</div>

<div class="card">
  <header class="card-header">
    <h2 class="title">Sidebar Look</h2>
    <p class="subtitle">Density, size, and active-state details</p>
  </header>

  <div class="rows">
    <div class="row">
      <div class="copy">
        <h3 class="row-title">Item Size</h3>
        <p class="row-desc">Spacing and type size for menu rows</p>
      </div>
      <div class="control">
        <Select
          value={density}
          onChange={(value) => (settingsState.sidebarDensity = value)}
          options={[
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfortable" },
            { value: "large", label: "Large" },
          ]}
        />
      </div>
    </div>

    <div class="row">
      <div class="copy">
        <h3 class="row-title">Corner Radius</h3>
        <p class="row-desc">Roundness of menu items ({radius}px)</p>
      </div>
      <div class="control slider">
        <Slider
          state={radius}
          min={0}
          max={24}
          step={1}
          onChange={(value) => (settingsState.sidebarCornerRadius = value)}
        />
      </div>
    </div>

    <div class="row">
      <div class="copy">
        <h3 class="row-title">Active Indicator</h3>
        <p class="row-desc">How the current page is highlighted</p>
      </div>
      <div class="control">
        <Select
          value={indicator}
          onChange={(value) => (settingsState.sidebarActiveIndicator = value)}
          options={[
            { value: "fill", label: "Fill" },
            { value: "bar", label: "Left bar" },
            { value: "outline", label: "Outline" },
            { value: "underline", label: "Underline" },
          ]}
        />
      </div>
    </div>

    <div class="row">
      <div class="copy">
        <h3 class="row-title">Sidebar Width</h3>
        <p class="row-desc">Overall navigation column width</p>
      </div>
      <div class="control">
        <Select
          value={width}
          onChange={(value) => (settingsState.sidebarWidth = value)}
          options={[
            { value: "narrow", label: "Narrow" },
            { value: "default", label: "Default" },
            { value: "wide", label: "Wide" },
          ]}
        />
      </div>
    </div>

    <div class="row">
      <div class="copy">
        <h3 class="row-title">Transparency Effects</h3>
        <p class="row-desc">Use glass effects on supported surfaces (may impact battery life)</p>
      </div>
      <div class="control toggle">
        <Switch
          state={transparencyOn}
          onChange={(value) => (settingsState.transparencyEffects = value)}
        />
      </div>
    </div>

    {#if transparencyOn}
      <div class="row">
        <div class="copy">
          <h3 class="row-title">Blur Strength</h3>
          <p class="row-desc">Glass blur on the sidebar ({blur}px)</p>
        </div>
        <div class="control slider">
          <Slider
            state={blur}
            min={0}
            max={80}
            step={1}
            onChange={(value) => (settingsState.sidebarBlur = value)}
          />
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .card {
    margin: 4px 0;
    padding: 4px;
    border-radius: 0.75rem;
    border: 1px solid rgb(228 228 231 / 0.5);
    background: linear-gradient(to bottom right, white, rgb(244 244 245));
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
  }

  :global(.dark) .card {
    border-color: rgb(63 63 70 / 0.4);
    background: linear-gradient(
      to bottom right,
      rgb(24 24 27 / 0.4),
      rgb(24 24 27 / 0.5)
    );
  }

  .card-header {
    padding: 1rem 1.25rem 0.5rem;
  }

  .card-header.split {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  .title {
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.3;
  }

  .subtitle {
    margin-top: 0.15rem;
    font-size: 1rem;
    color: rgb(82 82 91);
  }

  :global(.dark) .subtitle {
    color: rgb(212 212 216);
  }

  .selected-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
    max-width: 14rem;
    gap: 0.15rem;
  }

  .selected-label {
    font-size: 0.95rem;
    font-weight: 700;
  }

  .selected-desc {
    font-size: 0.8rem;
    line-height: 1.35;
    color: rgb(113 113 122);
  }

  :global(.dark) .selected-desc {
    color: rgb(161 161 170);
  }

  .picker-body {
    display: grid;
    grid-template-columns: minmax(160px, 210px) 1fr;
    gap: 1rem;
    padding: 0.5rem 1rem 1rem;
  }

  @media (max-width: 720px) {
    .picker-body {
      grid-template-columns: 1fr;
    }
  }

  .preview-pane {
    display: flex;
    align-items: center;
  }

  .preview {
    width: 100%;
    max-width: 196px;
    height: 280px;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 14px 32px rgb(0 0 0 / 0.22);
    background: linear-gradient(160deg, #aa053a, #141414 70%);
  }

  .preview-chrome {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 14px 0 10px;
    color: #fff;
  }

  .preview-logo {
    width: 42%;
    height: 10px;
    margin: 0 16px 14px;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.35);
  }

  .preview-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px 6px;
    padding: 8px 10px;
    border-radius: 12px;
  }

  .preview-item.active {
    background: rgba(0, 0, 0, 0.35);
  }

  .preview.style-soft .preview-item {
    margin: 0 10px 8px;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  }

  .preview.style-pill .preview-item {
    margin: 0 12px 7px;
    border-radius: 999px;
  }

  .preview.style-glass .preview-item {
    margin: 0 10px 7px;
    background: rgba(255, 255, 255, 0.12);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
  }

  .preview.style-glass .preview-item.active {
    background: rgba(255, 255, 255, 0.22);
  }

  .preview.style-sharp .preview-item {
    margin: 0 6px 4px;
    border-radius: 4px;
  }

  .preview.style-strip .preview-item {
    margin: 0;
    border-radius: 0;
    background: transparent;
  }

  .preview.style-strip .preview-item.active {
    position: relative;
    background: rgba(255, 255, 255, 0.12);
  }

  .preview.style-strip .preview-item.active::after {
    content: "";
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 3px;
    border-radius: 2px;
    background: #fff;
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.55);
  }

  .preview.style-neon .preview-item.active {
    background: rgba(255, 255, 255, 0.1);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.55),
      0 0 12px rgba(255, 255, 255, 0.4),
      0 0 22px rgba(255, 255, 255, 0.22);
  }

  .preview-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.75);
    flex: 0 0 auto;
  }

  .preview-label {
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }

  .options {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 0.65rem;
    align-content: start;
  }

  .option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem;
    border: 1px solid transparent;
    border-radius: 0.75rem;
    background: rgb(255 255 255 / 0.55);
    color: inherit;
    cursor: pointer;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  :global(.dark) .option {
    background: rgb(39 39 42 / 0.55);
  }

  .option:hover {
    transform: scale(1.02);
  }

  .option:active {
    transform: scale(0.98);
  }

  .option.active {
    border-color: var(--theme-primary, #f43f5e);
    box-shadow: 0 0 0 1px var(--theme-primary, #f43f5e);
  }

  .option:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--theme-primary, #f43f5e);
  }

  .thumb {
    width: 100%;
    aspect-ratio: 3 / 4;
    border-radius: 10px;
    overflow: hidden;
    background: linear-gradient(160deg, #aa053a, #141414 70%);
  }

  .thumb-chrome {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    height: 100%;
    padding: 8px 6px;
  }

  .thumb-item {
    height: 10px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.18);
  }

  .thumb-item.active {
    background: rgba(0, 0, 0, 0.4);
  }

  .thumb.style-pill .thumb-item {
    border-radius: 999px;
  }

  .thumb.style-sharp .thumb-item {
    border-radius: 2px;
  }

  .thumb.style-strip .thumb-item {
    border-radius: 0;
  }

  .thumb.style-strip .thumb-item.active {
    background: rgba(255, 255, 255, 0.22);
    box-shadow: inset 3px 0 0 #fff;
  }

  .thumb.style-glass .thumb-item {
    background: rgba(255, 255, 255, 0.22);
  }

  .thumb.style-neon .thumb-item.active {
    background: rgba(255, 255, 255, 0.2);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.5),
      0 0 8px rgba(255, 255, 255, 0.55);
  }

  .option-label {
    font-size: 0.8rem;
    font-weight: 700;
  }

  .rows {
    display: flex;
    flex-direction: column;
    padding: 0.25rem 0.5rem 0.75rem;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.85rem 0.75rem;
    border-top: 1px solid rgb(244 244 245);
  }

  :global(.dark) .row {
    border-top-color: rgb(63 63 70 / 0.5);
  }

  .row:first-child {
    border-top: none;
  }

  .copy {
    min-width: 0;
    flex: 1 1 auto;
    padding-right: 0.5rem;
  }

  .row-title {
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1.3;
  }

  .row-desc {
    margin-top: 0.1rem;
    font-size: 0.95rem;
    color: rgb(82 82 91);
  }

  :global(.dark) .row-desc {
    color: rgb(212 212 216);
  }

  .control {
    flex: 0 0 auto;
    min-width: 9.5rem;
    max-width: 12rem;
  }

  .control.slider {
    min-width: 10rem;
    width: 11rem;
  }

  .control.toggle {
    display: flex;
    justify-content: flex-end;
  }
</style>
