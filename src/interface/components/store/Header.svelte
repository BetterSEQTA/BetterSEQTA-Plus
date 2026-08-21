<script lang="ts">
  import darkLogo from "@/resources/icons/betterseqta-dark-full.png";
  import lightLogo from "@/resources/icons/betterseqta-light-full.png";
  import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";
  import MotionDiv from "../MotionDiv.svelte";
  import PlainCloseButton from "../PlainCloseButton.svelte";
  import CloudHeader from "./CloudHeader.svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";

  type SettingsPage = "settings" | "themes" | "backgrounds";

  let {
    searchTerm,
    setSearchTerm,
    activePage,
    setActivePage,
    showStoreTools,
    onLogoClick,
    onClose,
  } = $props<{
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    activePage: SettingsPage;
    setActivePage: (page: SettingsPage) => void;
    showStoreTools: boolean;
    onLogoClick: () => void;
    onClose: () => void;
  }>();

  const tabs: { id: SettingsPage; title: string }[] = [
    { id: "settings", title: "Settings" },
    { id: "themes", title: "Themes" },
    { id: "backgrounds", title: "Backgrounds" },
  ];

  const activeIndex = $derived(tabs.findIndex((tab) => tab.id === activePage));
  const motion = $derived($settingsState.animations ? "var(--bs-settings-ease)" : "0s");
</script>

<header
  class="flex shrink-0 items-center gap-4 border-b border-zinc-200/60 px-5 py-4 dark:border-zinc-700/50"
  style="--bs-settings-ease: 0.28s cubic-bezier(0.22, 1, 0.36, 1)"
>
  <button type="button" class="hidden shrink-0 lg:block" onclick={onLogoClick}>
    <img
      src={resolveExtensionAssetUrl(darkLogo)}
      class="h-11 w-52 object-cover dark:hidden"
      alt="BetterSEQTA+"
    />
    <img
      src={resolveExtensionAssetUrl(lightLogo)}
      class="hidden h-11 w-52 object-cover dark:block"
      alt="BetterSEQTA+"
    />
  </button>

  <div
    class="tab-track h-12 min-w-0 flex-1 rounded-full bg-zinc-100/80 p-1 dark:bg-zinc-900/50"
    role="tablist"
    aria-label="Settings pages"
  >
    <div class="relative flex">
      <MotionDiv
        class="absolute inset-y-0 left-0 z-0 w-1/3 rounded-full bg-white shadow-sm dark:bg-zinc-700"
        animate={{ x: `${activeIndex * 100}%` }}
        transition={{ type: "spring", stiffness: 250, damping: 25 }}
      />
      {#each tabs as tab (tab.id)}
        <button
          type="button"
          role="tab"
          aria-selected={activePage === tab.id}
          onclick={() => setActivePage(tab.id)}
          class="relative z-10 h-10 flex-1 whitespace-nowrap rounded-full px-4 text-base transition-colors duration-200
            {activePage === tab.id
            ? 'font-semibold text-zinc-900 dark:text-white'
            : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}"
        >
          {tab.title}
        </button>
      {/each}
    </div>
  </div>

  <div class="flex shrink-0 items-center gap-2">
    <div
      class="store-search-wrap hidden md:block"
      class:store-search-wrap--open={showStoreTools}
      style="transition: max-width {motion}, opacity {motion}, transform {motion}"
      aria-hidden={!showStoreTools}
    >
      <label class="relative block w-40 md:w-48 xl:w-56">
        <span class="sr-only">Search {activePage}</span>
        <svg
          class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
        </svg>
        <input
          type="search"
          placeholder={activePage === "themes" ? "Search themes" : "Search backgrounds"}
          value={searchTerm}
          tabindex={showStoreTools ? undefined : -1}
          oninput={(event) => setSearchTerm(event.currentTarget.value)}
          class="store-search h-12 w-full rounded-full bg-zinc-100/80 pl-9 pr-4 text-sm text-zinc-900 transition-colors duration-150 placeholder:text-zinc-400 focus:bg-zinc-200/70 dark:bg-zinc-900/50 dark:text-white dark:focus:bg-zinc-700"
        />
      </label>
    </div>

    {#if showStoreTools}
      <CloudHeader />
    {/if}

    <PlainCloseButton onclick={onClose} label="Close settings" />
  </div>
</header>

<style>
  .store-search-wrap {
    overflow: hidden;
    max-width: 0;
    opacity: 0;
    transform: translateX(8px);
    pointer-events: none;
  }

  .store-search-wrap--open {
    max-width: 10rem;
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
  }

  @media (min-width: 1280px) {
    .store-search-wrap--open {
      max-width: 14rem;
    }
  }

  .store-search,
  .store-search:focus,
  .store-search:focus-visible {
    appearance: none;
    border: 0 !important;
    outline: 0 !important;
    box-shadow: none !important;
  }
</style>
