<script lang="ts">
  import Settings from "./settings/general.svelte";
  import Shortcuts from "./settings/shortcuts.svelte";
  import Theme from "./settings/theme.svelte";
  import browser from "webextension-polyfill";

  import { standalone as StandaloneStore } from "../utils/standalone.svelte";
  import { onMount, onDestroy } from "svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";

  import { closeExtensionPopup } from "@/seqta/utils/Closers/closeExtensionPopup";
  import { OpenAboutPage } from "@/seqta/utils/Openers/OpenAboutPage";
  import { OpenWhatsNewPopup } from "@/seqta/utils/Openers/OpenWhatsNewPopup";

  import type { Component } from "svelte";
  import FontPickerModal from "../components/FontPickerModal.svelte";
  import CloudPanel from "../components/CloudPanel.svelte";
  import DisclaimerModal from "../components/DisclaimerModal.svelte";
  import { settingsPopup } from "@/seqta/utils/settingsPopup";
  import {
    checkGithubReleaseUpdate,
    dismissNightlyUpdate,
    getInstalledGhReleaseChannelLabel,
    isGhReleaseUpdateCheckEnabled,
    type GhReleaseUpdateInfo,
  } from "@/utils/githubReleaseUpdate";
  import { getAllPluginSettings } from "@/plugins";
  import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";

  type PageId = "settings" | "shortcuts" | "themes";

  type NavItem = {
    id: string;
    label: string;
  };

  let devModeSequence = "";
  let activePage = $state<PageId>("settings");
  let activeSection = $state("general");
  let showDisclaimerModal = $state(false);
  let disclaimerCallbacks = $state<{ onConfirm: () => void; onCancel: () => void } | null>(null);
  let disclaimerTitle = $state("Confirm");
  let disclaimerMessage = $state("");
  const ghReleaseUpdateEnabled = isGhReleaseUpdateCheckEnabled();
  const ghReleaseChannelLabel = getInstalledGhReleaseChannelLabel();
  let ghReleaseUpdate = $state<GhReleaseUpdateInfo | null>(null);

  const pages: { id: PageId; title: string }[] = [
    { id: "settings", title: "Settings" },
    { id: "shortcuts", title: "Shortcuts" },
    { id: "themes", title: "Themes" },
  ];

  const pluginNavItems = getAllPluginSettings()
    .filter((plugin) => !(isSeqtaEngageExperience() && plugin.pluginId === "global-search"))
    .filter(
      (plugin) =>
        (plugin as { disableToggle?: boolean }).disableToggle ||
        Object.keys(plugin.settings ?? {}).length > 0,
    )
    .map((plugin) => ({
      id: `plugin:${plugin.pluginId}`,
      label: plugin.name,
    }));

  const userNav: NavItem[] = [
    { id: "account", label: "My Account" },
    { id: "general", label: "General" },
    { id: "appearance", label: "Appearance" },
    { id: "home", label: "Home" },
  ];

  const appNav: NavItem[] = [...pluginNavItems, { id: "advanced", label: "Advanced" }];

  const sectionTitle = $derived.by(() => {
    if (activePage === "shortcuts") return "Shortcuts";
    if (activePage === "themes") return "Themes";
    const all = [...userNav, ...appNav];
    return all.find((item) => item.id === activeSection)?.label ?? "Settings";
  });

  const openGhRelease = () => {
    const url =
      ghReleaseUpdate?.url ?? "https://github.com/BetterSEQTA/BetterSEQTA-Plus/releases";
    if (ghReleaseUpdate?.available) {
      dismissNightlyUpdate();
    }
    window.open(url, "_blank");
    closeExtensionPopup();
  };

  const handleDevModeToggle = () => {
    const handleKeyDown = (event: KeyboardEvent) => {
      devModeSequence += event.key.toLowerCase();
      if (devModeSequence.includes("dev")) {
        document.removeEventListener("keydown", handleKeyDown);
        settingsState.devMode = true;
        alert("Dev mode is now enabled");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    setTimeout(() => {
      document.removeEventListener("keydown", handleKeyDown);
      devModeSequence = "";
    }, 10000);
  };

  let ColourPickerComponent = $state<Component | null>(null);

  const openColourPicker = async () => {
    if (!ColourPickerComponent) {
      ColourPickerComponent = (await import("../components/ColourPicker.svelte")).default;
    }
    showColourPicker = true;
  };

  const openFontPicker = () => {
    showFontPicker = true;
  };

  const openChangelog = () => {
    OpenWhatsNewPopup();
    closeExtensionPopup();
  };

  const openAbout = () => {
    OpenAboutPage();
    closeExtensionPopup();
  };

  const openPrivacyStatement = () => {
    window.open("https://betterseqta.org/privacy", "_blank");
    closeExtensionPopup();
  };

  let { standalone } = $props<{ standalone?: boolean }>();
  let showColourPicker = $state<boolean>(false);
  let showFontPicker = $state<boolean>(false);
  let showCloudPanel = $state<boolean>(false);

  const openCloudPanel = () => {
    showCloudPanel = true;
  };

  const showDisclaimer = (
    onConfirm: () => void,
    onCancel: () => void,
    title = "Confirm",
    message = "",
  ) => {
    disclaimerCallbacks = { onConfirm, onCancel };
    disclaimerTitle = title;
    disclaimerMessage = message;
    showDisclaimerModal = true;
  };

  const closePopupsOnSettingsClose = () => {
    showColourPicker = false;
    showFontPicker = false;
    showCloudPanel = false;
  };

  const handleClose = () => {
    if (!standalone) {
      closeExtensionPopup();
    }
  };

  const selectPage = (page: PageId) => {
    activePage = page;
  };

  const selectSection = (id: string) => {
    activeSection = id;
    activePage = "settings";
  };

  onMount(() => {
    settingsPopup.addListener(closePopupsOnSettingsClose);

    if (standalone) {
      StandaloneStore.setStandalone(true);
    }

    if (ghReleaseUpdateEnabled) {
      void checkGithubReleaseUpdate().then((info) => {
        ghReleaseUpdate = info;
      });
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !standalone) {
        closeExtensionPopup();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  onDestroy(() => {
    settingsPopup.removeListener(closePopupsOnSettingsClose);
  });
</script>

{#snippet navButton(item: NavItem)}
  <button
    type="button"
    onclick={() => selectSection(item.id)}
    class="w-full px-3 py-2 text-left text-base rounded-lg transition-all duration-200
      {activePage === 'settings' && activeSection === item.id
      ? 'bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-900 dark:text-white font-medium'
      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/40 hover:text-zinc-900 dark:hover:text-white'}"
  >
    {item.label}
  </button>
{/snippet}

{#snippet settingsShell()}
  <div
    class="flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-zinc-800 dark:text-white {standalone
      ? ''
      : 'rounded-xl shadow-2xl border border-zinc-200/60 dark:border-zinc-700/60'}"
  >
    <!-- Top bar: logo + page selectors + actions -->
    <div
      class="flex shrink-0 items-center gap-4 px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-700/50"
    >
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <img
        src={browser.runtime.getURL("resources/icons/betterseqta-dark-full.png")}
        class="h-9 w-auto dark:hidden shrink-0 cursor-pointer"
        alt="BetterSEQTA+"
        onclick={handleDevModeToggle}
      />
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <img
        src={browser.runtime.getURL("resources/icons/betterseqta-light-full.png")}
        class="hidden h-9 w-auto dark:block shrink-0 cursor-pointer"
        alt="BetterSEQTA+"
        onclick={handleDevModeToggle}
      />

      <div
        class="flex flex-1 items-center justify-center gap-1 p-1.5 rounded-full bg-zinc-100/80 dark:bg-zinc-900/50"
        role="tablist"
        aria-label="Settings pages"
      >
        {#each pages as page (page.id)}
          <button
            type="button"
            role="tab"
            aria-selected={activePage === page.id}
            onclick={() => selectPage(page.id)}
            class="flex-1 px-4 py-2 text-base rounded-full transition-all duration-200
              {activePage === page.id
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-semibold shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
          >
            {page.title}
          </button>
        {/each}
      </div>

      {#if !standalone}
        <div class="flex items-center gap-1 shrink-0">
          {#if ghReleaseUpdateEnabled}
            <div class="flex flex-col items-end gap-0.5 max-w-[8.5rem] mr-0.5">
              {#if ghReleaseUpdate?.available}
                <button
                  type="button"
                  onclick={openGhRelease}
                  class="px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-white rounded-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 transition-colors duration-200"
                  title="Open GitHub release"
                >
                  Update — {ghReleaseUpdate.label}
                </button>
              {/if}
              <p class="text-[9px] leading-tight text-right text-zinc-500 dark:text-zinc-400">
                {#if ghReleaseChannelLabel}
                  {ghReleaseChannelLabel} — do not upload to stores.
                {:else}
                  GitHub build — do not upload to stores.
                {/if}
              </p>
            </div>
          {/if}
          <button
            type="button"
            onclick={openAbout}
            class="flex justify-center items-center w-9 h-9 text-xl rounded-lg font-IconFamily bg-zinc-100 dark:bg-zinc-700 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-800"
            aria-label="About"
          >
            &#xeb73;
          </button>
          <button
            type="button"
            onclick={openChangelog}
            class="flex justify-center items-center w-9 h-9 text-xl rounded-lg font-IconFamily bg-zinc-100 dark:bg-zinc-700 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-800"
            aria-label="Changelog"
          >
            &#xe929;
          </button>
          <button
            type="button"
            onclick={openPrivacyStatement}
            class="flex justify-center items-center w-9 h-9 text-xl rounded-lg font-IconFamily bg-zinc-100 dark:bg-zinc-700 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-800"
            aria-label="Privacy Statement"
          >
            &#xecba;
          </button>
          <button
            type="button"
            onclick={handleClose}
            class="flex justify-center items-center w-9 h-9 text-xl rounded-lg font-IconFamily bg-zinc-100 dark:bg-zinc-700 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-800"
            aria-label="Close settings"
          >
            &#xea0f;
          </button>
        </div>
      {/if}
    </div>

    <!-- Body: left nav + content -->
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <nav
        class="flex flex-col shrink-0 gap-5 overflow-y-auto no-scrollbar border-r border-zinc-200/60 dark:border-zinc-700/50 bg-zinc-50/80 dark:bg-zinc-900/40 {standalone
          ? 'w-[140px] px-2 py-3'
          : 'w-[260px] px-4 py-5'}"
        aria-label="Settings categories"
      >
        {#if activePage === "settings"}
          <div class="flex flex-col gap-1">
            <p
              class="px-3 mb-1.5 text-xs font-semibold tracking-wider uppercase text-zinc-400 dark:text-zinc-500"
            >
              User Settings
            </p>
            {#each userNav as item (item.id)}
              {@render navButton(item)}
            {/each}
          </div>
          <div class="flex flex-col gap-1">
            <p
              class="px-3 mb-1.5 text-xs font-semibold tracking-wider uppercase text-zinc-400 dark:text-zinc-500"
            >
              App Settings
            </p>
            {#each appNav as item (item.id)}
              {@render navButton(item)}
            {/each}
          </div>
        {:else if activePage === "shortcuts"}
          <div class="flex flex-col gap-1">
            <p
              class="px-3 mb-1.5 text-xs font-semibold tracking-wider uppercase text-zinc-400 dark:text-zinc-500"
            >
              Shortcuts
            </p>
            <button
              type="button"
              class="w-full px-3 py-2 text-left text-base rounded-lg font-medium bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-900 dark:text-white"
            >
              Shortcuts
            </button>
          </div>
        {:else}
          <div class="flex flex-col gap-1">
            <p
              class="px-3 mb-1.5 text-xs font-semibold tracking-wider uppercase text-zinc-400 dark:text-zinc-500"
            >
              Themes
            </p>
            <button
              type="button"
              class="w-full px-3 py-2 text-left text-base rounded-lg font-medium bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-900 dark:text-white"
            >
              Themes
            </button>
          </div>
        {/if}
      </nav>

      <div class="flex flex-col flex-1 min-w-0 min-h-0">
        <div class="shrink-0 px-6 pt-5 pb-3">
          <h1 class="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            {sectionTitle}
          </h1>
        </div>
        <div class="flex-1 min-h-0 px-4 pb-8 overflow-y-auto no-scrollbar">
          {#if activePage === "settings"}
            <Settings
              showColourPicker={openColourPicker}
              showFontPicker={openFontPicker}
              {showDisclaimer}
              showCloudPanel={openCloudPanel}
              {activeSection}
            />
          {:else if activePage === "shortcuts"}
            <Shortcuts />
          {:else}
            <Theme />
          {/if}
        </div>
      </div>
    </div>
  </div>
{/snippet}

{#if standalone}
  <div
    class="relative w-[384px] h-[600px] no-scrollbar shadow-2xl overflow-clip {$settingsState.DarkMode
      ? 'dark'
      : ''}"
  >
    {@render settingsShell()}
  </div>
{:else}
  <div
    class="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 {$settingsState.DarkMode
      ? 'dark'
      : ''}"
    role="dialog"
    aria-modal="true"
    aria-label="BetterSEQTA+ settings"
  >
    <button
      type="button"
      class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-colors duration-200"
      aria-label="Close settings"
      onclick={handleClose}
    ></button>

    <div
      class="relative z-10 w-[min(1180px,96vw)] h-[min(860px,92vh)] no-scrollbar overflow-clip"
    >
      {@render settingsShell()}
    </div>
  </div>
{/if}

{#if showColourPicker && ColourPickerComponent}
  <ColourPickerComponent
    hidePicker={() => {
      showColourPicker = false;
    }}
  />
{/if}

{#if showCloudPanel}
  <CloudPanel
    hidePanel={() => {
      showCloudPanel = false;
    }}
  />
{/if}

{#if showFontPicker}
  <FontPickerModal
    hidePicker={() => {
      showFontPicker = false;
    }}
  />
{/if}

{#if showDisclaimerModal && disclaimerCallbacks}
  <DisclaimerModal
    title={disclaimerTitle}
    message={disclaimerMessage}
    onConfirm={() => {
      disclaimerCallbacks?.onConfirm();
      showDisclaimerModal = false;
      disclaimerCallbacks = null;
    }}
    onCancel={() => {
      disclaimerCallbacks?.onCancel();
      showDisclaimerModal = false;
      disclaimerCallbacks = null;
    }}
  />
{/if}
