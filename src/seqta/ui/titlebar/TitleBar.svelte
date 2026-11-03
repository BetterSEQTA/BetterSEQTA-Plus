<script lang="ts">
  import SearchIcon from "@lucide/svelte/icons/search";
  import { titleBarState } from "./titleBarState.svelte";
</script>

<div id="bsplus-title-root">
  <span data-testid="page-title">{titleBarState.pageTitle}</span>
  {#if titleBarState.showSearch}
    <div class="search-trigger-wrapper">
      <div class="search-trigger-anchor">
        <div class="search-trigger">
          <span>
            <SearchIcon size={16} />
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
