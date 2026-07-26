<script lang="ts">
  import { titleBarState } from "./titleBarState.svelte";
</script>

<div id="bsplus-title-root">
  <span data-testid="page-title">{titleBarState.pageTitle}</span>
  {#if titleBarState.showSearch}
    <div class="search-trigger-wrapper">
      <div class="search-trigger-anchor">
        <div class="search-trigger">
          <span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <p>Quick search...</p>
          <span
            class="search-trigger-hotkey"
            style="margin-left: auto; display: flex; align-items: center; color: rgb(119, 119, 119); font-size: 12px;"
          >{titleBarState.searchHotkeyLabel}</span>
        </div>
        <div class="search-progress-bar-wrapper">
          <div class="search-progress-track">
            <div class="search-progress-bar" style="width: 0%;"></div>
          </div>
        </div>
      </div>
      <div class="search-progress-text" aria-live="polite"></div>
    </div>
  {/if}
</div>
