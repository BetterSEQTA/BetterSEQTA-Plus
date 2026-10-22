<script lang="ts">
  import TabbedContainer from "../components/TabbedContainer.svelte";
  import LazyPanel from "../components/LazyPanel.svelte";
  import darkLogo from "@/resources/icons/betterseqta-dark-full.png";
  import lightLogo from "@/resources/icons/betterseqta-light-full.png";
  import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";

  import { standalone as StandaloneStore } from "../utils/standalone.svelte";
  import { onMount, onDestroy, tick } from "svelte";
  import { animate } from "motion";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import { isPerformanceMode } from "@/seqta/utils/performanceMode";

  import { closeExtensionPopup } from "@/seqta/utils/Closers/closeExtensionPopup";
  import { OpenAboutPage } from "@/seqta/utils/Openers/OpenAboutPage";
  import { OpenWhatsNewPopup } from "@/seqta/utils/Openers/OpenWhatsNewPopup";

  import type { Component } from "svelte";
  import SidebarNav from "../components/SidebarNav.svelte";
  import StoreHeader from "../components/store/Header.svelte";
  import { settingsPopup } from "@/seqta/utils/settingsPopup";
  import { armDevModeUnlock } from "@/seqta/utils/devModeUnlock";
  import { consumeOpenFeedbackRequest } from "@/seqta/utils/feedback/client";
  import {
    consumeSettingsDestination,
    SETTINGS_NAVIGATION_EVENT,
    type SettingsDestination,
  } from "@/seqta/utils/settingsNavigation";
  import {
    checkGithubReleaseUpdate,
    dismissNightlyUpdate,
    getInstalledGhReleaseChannelLabel,
    isGhReleaseUpdateCheckEnabled,
    type GhReleaseUpdateInfo,
  } from "@/utils/githubReleaseUpdate";
  type PageId = "settings" | "themes" | "backgrounds";
  type StoreTab = "themes" | "backgrounds";
  type ThemeView = "theme-settings" | "theme-store" | "community-themes" | "create-theme";
  type BackgroundView = "background-settings" | "background-store";

  const loadSettingsBody = () => import("./settings/SettingsBody.svelte");
  const loadShortcuts = () => import("./settings/shortcuts.svelte");
  const loadThemeSettings = () => import("./settings/theme.svelte");
  const loadStore = () => import("./store.svelte");
  const loadCommunityThemes = () => import("./communityThemes.svelte");

  type NavItem = {
    id: string;
    label: string;
    divided?: boolean;
    nested?: boolean;
    expanded?: boolean;
  };

  const BACKGROUND_CATEGORY_PREFIX = "background-category:";

  let compactActiveTab = $state(0);
  let expanded = $state(settingsState.settingsPopupExpanded === true);
  let lastExpandedTab: number | null = null;
  let activePage = $state<PageId>("settings");
  let activeSection = $state("general");
  let activeThemeView = $state<ThemeView>("theme-store");
  let activeBackgroundView = $state<BackgroundView>("background-settings");
  let selectedBackgroundCategory = $state("All");
  let backgroundCategories = $state<string[]>([]);
  let storeSearchTerm = $state("");
  let settingsSearch = $state("");
  let debouncedSettingsSearch = $state("");
  let settingsSearchTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    const query = settingsSearch;
    if (settingsSearchTimer) clearTimeout(settingsSearchTimer);
    const delay = isPerformanceMode() ? 250 : 150;
    settingsSearchTimer = setTimeout(() => {
      debouncedSettingsSearch = query;
      settingsSearchTimer = null;
    }, delay);
  });

  let showDisclaimerModal = $state(false);
  let disclaimerCallbacks = $state<{ onConfirm: () => void; onCancel: () => void } | null>(null);
  let disclaimerTitle = $state("Confirm");
  let disclaimerMessage = $state("");
  const ghReleaseUpdateEnabled = isGhReleaseUpdateCheckEnabled();
  const ghReleaseChannelLabel = getInstalledGhReleaseChannelLabel();
  let ghReleaseUpdate = $state<GhReleaseUpdateInfo | null>(null);

  const userNav: NavItem[] = [
    { id: "account", label: "My Account" },
    { id: "general", label: "General" },
    { id: "appearance", label: "Appearance" },
  ];

  $effect(() => {
    if (!$settingsState.devMode && activeSection === "advanced") activeSection = "general";
  });

  const appNav = $derived<NavItem[]>([
    { id: "timetable", label: "Timetable" },
    { id: "assessments", label: "Assessments" },
    { id: "features", label: "Features" },
    ...($settingsState.devMode ? [{ id: "advanced", label: "Advanced" }] : []),
    { id: "shortcuts", label: "Shortcuts" },
  ]);

  const settingsNavGroups = $derived([
    { label: "User Settings", items: userNav },
    { label: "App Settings", items: appNav },
  ]);

  const themeNavGroups = [
    {
      label: "Themes",
      items: [
        { id: "theme-store", label: "Theme store" },
        { id: "community-themes", label: "Community themes" },
        { id: "theme-settings", label: "Downloaded themes" },
        { id: "create-theme", label: "Custom themes" },
      ],
    },
  ];

  const backgroundNavGroups = $derived.by(() => {
    const storeOpen = activeBackgroundView === "background-store";
    const categoryItems: NavItem[] = storeOpen
      ? ["All", "Featured", ...backgroundCategories].map((category, index) => ({
          id: `${BACKGROUND_CATEGORY_PREFIX}${category}`,
          label: category,
          nested: true,
          divided: index === 2,
        }))
      : [];

    return [
      {
        label: "Backgrounds",
        items: [
          { id: "background-settings", label: "Background settings" },
          { id: "background-store", label: "Store", expanded: storeOpen },
          ...categoryItems,
        ],
      },
    ];
  });

  const navGroups = $derived(
    activePage === "settings"
      ? settingsNavGroups
      : activePage === "themes"
        ? themeNavGroups
        : backgroundNavGroups,
  );

  const selectedNavId = $derived(
    activePage === "settings"
      ? activeSection
      : activePage === "themes"
        ? activeThemeView
        : activeBackgroundView === "background-store"
          ? `${BACKGROUND_CATEGORY_PREFIX}${selectedBackgroundCategory}`
          : activeBackgroundView,
  );

  const sectionTitle = $derived.by(() => {
    if (activePage === "settings" && debouncedSettingsSearch.trim()) return "Search results";
    if (activePage === "themes") {
      if (activeThemeView === "theme-settings") return "Downloaded themes";
      if (activeThemeView === "create-theme") return "Custom themes";
      if (activeThemeView === "community-themes") return "Community themes";
      if (activeThemeView === "theme-store") return "Theme store";
      return "Themes";
    }
    if (activePage === "backgrounds") return "Backgrounds";
    return [...userNav, ...appNav].find((item) => item.id === activeSection)?.label ?? "Settings";
  });

  const activeThemeListMode = $derived.by(() => {
    if (activeThemeView === "create-theme") return "custom" as const;
    if (activeThemeView === "theme-settings") return "downloaded" as const;
    return "all" as const;
  });

  const isStoreView = $derived(
    (activePage === "themes" &&
      (activeThemeView === "theme-store" || activeThemeView === "community-themes")) ||
      (activePage === "backgrounds" && activeBackgroundView === "background-store"),
  );

  const isOfficialStoreView = $derived(
    activePage === "themes" && activeThemeView === "theme-store",
  );

  const openGhRelease = () => {
    const url =
      ghReleaseUpdate?.url ?? "https://github.com/BetterSEQTA/BetterSEQTA-Plus/releases";
    if (ghReleaseUpdate?.available) {
      dismissNightlyUpdate();
    }
    window.open(url, "_blank");
    closeExtensionPopup();
  };

  const handleDevModeToggle = () => armDevModeUnlock();

  let ColourPickerComponent = $state<Component | null>(null);
  let FontPickerComponent = $state<Component | null>(null);
  let CloudPanelComponent = $state<Component | null>(null);
  let DisclaimerModalComponent = $state<Component | null>(null);
  let FeedbackModalComponent = $state<Component | null>(null);

  const openColourPicker = async () => {
    if (!ColourPickerComponent) {
      ColourPickerComponent = (await import("../components/ColourPicker.svelte")).default;
    }
    showColourPicker = true;
  };

  const openFontPicker = async () => {
    if (!FontPickerComponent) {
      FontPickerComponent = (await import("../components/FontPickerModal.svelte")).default;
    }
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
  let showFeedbackModal = $state<boolean>(false);
  let feedbackFocusId = $state<string | null>(null);

  const openCloudPanel = async () => {
    if (!CloudPanelComponent) {
      CloudPanelComponent = (await import("../components/CloudPanel.svelte")).default;
    }
    showCloudPanel = true;
  };

  const openFeedback = async (feedbackId?: string | null) => {
    if (!FeedbackModalComponent) {
      FeedbackModalComponent = (await import("../components/FeedbackModal.svelte")).default;
    }
    feedbackFocusId = typeof feedbackId === "string" && feedbackId ? feedbackId : null;
    showFeedbackModal = true;
  };

  const showDisclaimer = async (
    onConfirm: () => void,
    onCancel: () => void,
    title = "Confirm",
    message = "",
  ) => {
    if (!DisclaimerModalComponent) {
      DisclaimerModalComponent = (await import("../components/DisclaimerModal.svelte")).default;
    }
    disclaimerCallbacks = { onConfirm, onCancel };
    disclaimerTitle = title;
    disclaimerMessage = message;
    showDisclaimerModal = true;
  };

  const settingsSharedProps = {
    showColourPicker: openColourPicker,
    showFontPicker: openFontPicker,
    showDisclaimer,
    showCloudPanel: openCloudPanel,
  };

  let settingsPanel = $state<HTMLElement>();
  let settingsContent = $state<HTMLElement>();
  let resizeSnapshot: HTMLElement | undefined;
  let resizeAnimation: ReturnType<typeof animate> | undefined;
  let resizeGeneration = 0;
  const bounds = ["width", "height", "top", "right"] as const;
  const clearMorphContent = () => {
    resizeSnapshot?.remove();
    resizeSnapshot = undefined;
    if (settingsContent) {
      settingsContent.style.removeProperty("width");
      settingsContent.style.removeProperty("height");
      settingsContent.style.removeProperty("opacity");
    }
  };
  const clearResize = () => {
    resizeGeneration++;
    resizeAnimation?.stop();
    resizeAnimation = undefined;
    if (settingsPanel) for (const key of bounds) settingsPanel.style.removeProperty(key);
    clearMorphContent();
  };

  const resizePanel = async (nextExpanded: boolean) => {
    const panel = settingsPanel;
    const content = settingsContent;
    const generation = ++resizeGeneration;
    const from = panel ? getComputedStyle(panel) : null;
    const start = bounds.map((key) => parseFloat(from?.[key] ?? "0"));
    resizeAnimation?.stop();
    const motionEnabled = $settingsState.animations !== false && !$settingsState.performanceMode &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = panel?.getRootNode() as ShadowRoot | Document | undefined;
    const restoreFocus = !!content?.contains(root?.activeElement ?? null);

    // A visual snapshot has no live component listeners or accessible controls.
    // Include the current crossfade when a second click reverses the morph.
    if (panel && content && motionEnabled) {
      const snapshot = document.createElement("div");
      snapshot.inert = true;
      snapshot.setAttribute("aria-hidden", "true");
      snapshot.setAttribute("data-settings-snapshot", "");
      snapshot.style.cssText = `position:absolute;top:0;right:0;width:${panel.clientWidth}px;height:${panel.clientHeight}px;overflow:hidden;pointer-events:none;z-index:20;`;
      snapshot.append(content.cloneNode(true));
      if (resizeSnapshot) snapshot.append(resizeSnapshot.cloneNode(true));
      snapshot.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
      resizeSnapshot?.remove();
      resizeSnapshot = snapshot;
      panel.append(snapshot);
      content.style.opacity = "0";
    } else {
      clearMorphContent();
    }

    expanded = nextExpanded;
    await tick();
    if (!panel || !content || generation !== resizeGeneration) return;
    for (const key of bounds) panel.style.removeProperty(key);
    if (restoreFocus) content.querySelector<HTMLButtonElement>(
      `[aria-label="${nextExpanded ? "Collapse" : "Expand"} settings"]`,
    )?.focus({ preventScroll: true });
    if (!motionEnabled) return;
    const targetStyle = getComputedStyle(panel);
    const target = bounds.map((key) => parseFloat(targetStyle[key]));
    // The incoming layout stays at its destination size while the outer bounds
    // move, so compact text and images never stretch across the expanded panel.
    content.style.width = `${panel.clientWidth}px`;
    content.style.height = `${panel.clientHeight}px`;
    bounds.forEach((key, index) => { panel.style[key] = `${start[index]}px`; });
    resizeAnimation = animate(0, 1, {
      type: "spring", stiffness: 420, damping: 36,
      onUpdate: (progress) => {
        if (generation !== resizeGeneration) return;
        const opacity = Math.max(0, Math.min(1, progress));
        content.style.opacity = String(opacity);
        if (resizeSnapshot) resizeSnapshot.style.opacity = String(1 - opacity);
        bounds.forEach((key, index) => {
          panel.style[key] = `${start[index] + (target[index] - start[index]) * progress}px`;
        });
      },
      onComplete: () => {
        if (generation !== resizeGeneration) return;
        for (const key of bounds) panel.style.removeProperty(key);
        clearMorphContent();
        resizeAnimation = undefined;
      },
    });
  };

  let restoreSizeAfterClose = false;
  const resetClosedLayout = () => {
    if (!restoreSizeAfterClose) return;
    clearResize();
    expanded = settingsState.settingsPopupExpanded === true;
    restoreSizeAfterClose = false;
  };
  const closePopupsOnSettingsClose = () => {
    resizeGeneration++;
    resizeAnimation?.stop();
    resizeAnimation = undefined;
    if (expanded) syncCompactTab();
    restoreSizeAfterClose = true;
    if (document.getElementById("ExtensionPopup")?.style.opacity === "0") resetClosedLayout();
    showColourPicker = false;
    showFontPicker = false;
    showCloudPanel = false;
    showFeedbackModal = false;
    feedbackFocusId = null;
  };

  const handleClose = () => {
    if (!standalone) {
      closeExtensionPopup();
    }
  };

  const syncCompactTab = () => {
    compactActiveTab = activePage === "settings"
        ? activeSection === "shortcuts" ? 1 : 0
        : 2;
    lastExpandedTab = compactActiveTab;
  };

  const toggleExpanded = () => {
    settingsState.settingsPopupExpanded = !expanded;
    if (expanded) {
      syncCompactTab();
    } else if (compactActiveTab === lastExpandedTab) {
      void resizePanel(true);
      return;
    } else if (compactActiveTab === 1) {
      activePage = "settings";
      activeSection = "shortcuts";
    } else if (compactActiveTab === 2) {
      activePage = "themes";
      activeThemeView = "theme-settings";
    } else {
      activePage = "settings";
      if (activeSection === "shortcuts") activeSection = "general";
    }
    void resizePanel(!expanded);
  };

  const selectNavItem = (id: string) => {
    if (activePage === "settings") {
      settingsSearch = "";
      activeSection = id;
      return;
    }

    if (activePage === "themes") {
      activeThemeView = id as ThemeView;
      return;
    }

    if (id.startsWith(BACKGROUND_CATEGORY_PREFIX)) {
      activeBackgroundView = "background-store";
      selectedBackgroundCategory = id.slice(BACKGROUND_CATEGORY_PREFIX.length);
    } else {
      activeBackgroundView = id as BackgroundView;
    }
  };

  const applyDestination = (destination: SettingsDestination) => {
    clearResize();
    restoreSizeAfterClose = false;
    expanded = true;
    activePage = destination.page;
    if (destination.page === "settings") {
      if (destination.section) {
        settingsSearch = "";
        activeSection = destination.section;
      }
      if (destination.search) {
        settingsSearch = destination.search;
      }
    } else if (destination.page === "themes" && destination.view) {
      activeThemeView =
        destination.view === "store"
          ? "theme-store"
          : destination.view === "community"
            ? "community-themes"
            : destination.view === "custom"
              ? "create-theme"
              : "theme-settings";
    } else if (destination.page === "backgrounds" && destination.view) {
      activeBackgroundView = destination.view === "store" ? "background-store" : "background-settings";
    }
  };

  const utilityActions = [
    { label: "About", icon: "\ueb73", onclick: openAbout },
    { label: "What's new", icon: "\ue929", onclick: openChangelog },
    { label: "Privacy", icon: "\uecba", onclick: openPrivacyStatement },
  ] as const;

  onMount(() => {
    settingsPopup.addListener(closePopupsOnSettingsClose);
    window.addEventListener("bsplus:settings-hidden", resetClosedLayout);
    window.addEventListener("bsplus:settings-opening", resetClosedLayout);

    if (standalone) {
      StandaloneStore.setStandalone(true);
    }

    if (ghReleaseUpdateEnabled) {
      const runCheck = () => {
        void checkGithubReleaseUpdate().then((info) => {
          ghReleaseUpdate = info;
        });
      };
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(runCheck, { timeout: 4000 });
      } else {
        setTimeout(runCheck, 500);
      }
    }

    const pendingFeedbackId = consumeOpenFeedbackRequest();
    if (pendingFeedbackId) {
      openFeedback(pendingFeedbackId);
    }

    const onOpenFeedback = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (typeof id === "string" && id) openFeedback(id);
    };
    window.addEventListener("bsplus:open-feedback", onOpenFeedback);

    const onNavigateSettings = (event: Event) => {
      applyDestination((event as CustomEvent<SettingsDestination>).detail);
      consumeSettingsDestination();
    };
    window.addEventListener(SETTINGS_NAVIGATION_EVENT, onNavigateSettings);
    const pendingDestination = consumeSettingsDestination();
    if (pendingDestination) applyDestination(pendingDestination);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !standalone) {
        closeExtensionPopup();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("bsplus:settings-hidden", resetClosedLayout);
      window.removeEventListener("bsplus:settings-opening", resetClosedLayout);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("bsplus:open-feedback", onOpenFeedback);
      window.removeEventListener(SETTINGS_NAVIGATION_EVENT, onNavigateSettings);
    };
  });

  onDestroy(() => {
    clearResize();
    settingsPopup.removeListener(closePopupsOnSettingsClose);
  });
</script>

{#snippet settingsShell()}
  <div
    class="flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-zinc-800 dark:text-white text-[18px] {standalone
      ? ''
      : 'rounded-xl shadow-2xl border border-zinc-200/60 dark:border-zinc-700/60'}"
  >
    <StoreHeader
      searchTerm={storeSearchTerm}
      setSearchTerm={(term) => (storeSearchTerm = term)}
      {activePage}
      setActivePage={(page) => {
        activePage = page;
        if (page === "themes") activeThemeView = "theme-store";
      }}
      showStoreTools={isOfficialStoreView || activeThemeView === "community-themes"}
      onLogoClick={handleDevModeToggle}
      onClose={handleClose}
      onToggleSize={standalone ? undefined : toggleExpanded}
    />

    <!-- Body: left nav + content -->
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <nav
        class="flex flex-col shrink-0 min-h-0 border-r border-zinc-200/60 dark:border-zinc-700/50 bg-zinc-50/80 dark:bg-zinc-900/40 {standalone
          ? 'w-[140px] px-2 py-3'
          : 'w-[260px] px-4 py-5'}"
        aria-label="Settings categories"
      >
        {#if activePage === "settings"}
          <label class="relative mb-4 block shrink-0">
            <span class="sr-only">Search settings</span>
            <svg
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
              />
            </svg>
            <input
              type="search"
              placeholder="Search settings"
              bind:value={settingsSearch}
              class="h-10 w-full rounded-lg bg-zinc-200/70 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:bg-zinc-800/80 dark:text-white dark:placeholder:text-zinc-500 dark:focus:bg-zinc-800 dark:focus:ring-offset-zinc-900"
            />
          </label>
        {/if}

        <SidebarNav
          groups={navGroups}
          selectedId={selectedNavId}
          onselect={selectNavItem}
        />

        <div class="mt-4 flex shrink-0 flex-col gap-1 border-t border-zinc-200/60 pt-4 dark:border-zinc-700/50">
          {#if ghReleaseUpdateEnabled}
            <div class="px-3 pb-2">
              {#if ghReleaseUpdate?.available}
                <button
                  type="button"
                  onclick={openGhRelease}
                  class="mb-1 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-white rounded-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 transition-colors duration-200"
                  title="Open GitHub release"
                >
                  Update — {ghReleaseUpdate.label}
                </button>
              {/if}
              <p class="text-[9px] leading-tight text-zinc-500 dark:text-zinc-400">
                {ghReleaseChannelLabel ?? "GitHub build"} — do not upload to stores.
              </p>
            </div>
          {/if}

          {#each utilityActions as action (action.label)}
            <button
              type="button"
              onclick={action.onclick}
              class="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[16px] font-medium text-zinc-600 transition-[color,background-color,transform] duration-150 hover:bg-zinc-200/70 hover:text-zinc-950 active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:text-zinc-300 dark:hover:bg-zinc-700/70 dark:hover:text-white dark:focus:ring-offset-zinc-900"
            >
              <span class="w-5 text-center font-IconFamily text-[18px]" aria-hidden="true">{action.icon}</span>
              <span>{action.label}</span>
            </button>
          {/each}

          <button
            type="button"
            onclick={() => openFeedback()}
            class="mt-2 flex w-full items-center gap-3 rounded-lg bg-zinc-200/70 px-3 py-2.5 text-left text-[16px] font-medium text-zinc-700 transition-[color,background-color,transform] duration-150 hover:bg-zinc-300/80 active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:focus:ring-offset-zinc-900"
          >
            <svg
              class="w-5 h-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Send us feedback!</span>
          </button>
        </div>
      </nav>

      <div class="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {#if isStoreView}
          <div class="min-h-0 min-w-0 flex-1 overflow-hidden">
            {#if activePage === "themes" && activeThemeView === "community-themes"}
              <LazyPanel
                loader={loadCommunityThemes}
                remountKey="community-themes"
                props={{
                  searchTerm: storeSearchTerm,
                  setSearchTerm: (term: string) => (storeSearchTerm = term),
                }}
              />
            {:else}
              <LazyPanel
                loader={loadStore}
                remountKey="store"
                props={{
                  activeTab: activePage as StoreTab,
                  searchTerm: storeSearchTerm,
                  selectedBackgroundCategory,
                  setActiveTab: (tab: StoreTab) => {
                    activePage = tab;
                    if (tab === "themes") activeThemeView = "theme-store";
                    else activeBackgroundView = "background-store";
                  },
                  setSearchTerm: (term: string) => (storeSearchTerm = term),
                  setBackgroundCategories: (categories: string[]) =>
                    (backgroundCategories = categories),
                }}
              />
            {/if}
          </div>
        {:else}
          <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div class="shrink-0 px-6 pt-5 pb-3">
              <h1 class="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                {sectionTitle}
              </h1>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-8 no-scrollbar">
              {#if activePage === "settings"}
                {#if activeSection === "shortcuts" && !debouncedSettingsSearch.trim()}
                  <LazyPanel loader={loadShortcuts} remountKey="shortcuts-page" />
                {:else}
                  <LazyPanel
                    loader={loadSettingsBody}
                    remountKey="settings-body"
                    props={{
                      ...settingsSharedProps,
                      activeSection: debouncedSettingsSearch.trim() ? "all" : activeSection,
                      searchQuery: debouncedSettingsSearch,
                    }}
                  />
                  {#if debouncedSettingsSearch.trim()}
                    <LazyPanel
                      loader={loadShortcuts}
                      remountKey="shortcuts-search"
                      props={{ searchQuery: debouncedSettingsSearch }}
                    />
                  {/if}
                {/if}
              {:else if activePage === "themes"}
                <LazyPanel
                  loader={loadThemeSettings}
                  remountKey={`theme-settings-${activeThemeListMode}`}
                  props={{ section: "themes", listMode: activeThemeListMode }}
                />
              {:else}
                <LazyPanel
                  loader={loadThemeSettings}
                  remountKey="background-settings"
                  props={{ section: "backgrounds" }}
                />
              {/if}
            </div>
          </div>
        {/if}

      </div>
    </div>
  </div>
{/snippet}

{#snippet compactSettings()}
  <div
    class="flex h-full min-h-0 flex-col gap-2 overflow-hidden bg-white dark:bg-zinc-800 dark:text-white"
  >
    <div
      class="grid shrink-0 items-center border-b border-zinc-200/40 dark:border-zinc-700/40 {standalone ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr)_44px] gap-2 px-2'}"
    >
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <img
        src={resolveExtensionAssetUrl(darkLogo)}
        class="min-w-0 dark:hidden {standalone ? 'mx-auto w-4/5' : 'h-auto w-full max-w-[296px] justify-self-center object-contain'}"
        alt="BetterSEQTA+"
        onclick={handleDevModeToggle}
      />
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <img
        src={resolveExtensionAssetUrl(lightLogo)}
        class="hidden min-w-0 dark:block {standalone ? 'mx-auto w-4/5' : 'h-auto w-full max-w-[296px] justify-self-center object-contain'}"
        alt="BetterSEQTA+"
        onclick={handleDevModeToggle}
      />
      {#if !standalone}
        <button type="button" onclick={toggleExpanded}
          class="mt-2 flex h-11 w-11 shrink-0 self-start items-center justify-center text-zinc-500 transition-[color,transform] duration-150 hover:text-zinc-950 active:scale-[0.96] focus:outline-none dark:text-zinc-400 dark:hover:text-white"
          aria-label="Expand settings" title="Expand settings" aria-expanded="false">
          <span class="font-IconFamily text-2xl" aria-hidden="true">{"\uebdb"}</span>
        </button>
      {/if}
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <TabbedContainer
        bind:activeTab={compactActiveTab}
        tabs={[
          {
            title: "Settings",
            loader: loadSettingsBody,
            props: {
              ...settingsSharedProps,
              activeSection: "all",
            },
          },
          {
            title: "Shortcuts",
            loader: loadShortcuts,
          },
          {
            title: "Themes",
            loader: loadThemeSettings,
            props: { section: "all" },
          },
        ]}
      />
    </div>
  </div>
{/snippet}

{#if standalone}
  <div
    class="relative w-[384px] h-[600px] no-scrollbar shadow-2xl overflow-clip {$settingsState.DarkMode
      ? 'dark'
      : ''}"
  >
    {@render compactSettings()}
  </div>
{:else}
  <div
    class="absolute inset-0 z-50 {$settingsState.DarkMode
      ? 'dark'
      : ''}"
    role="dialog"
    aria-modal="true"
    aria-label="BetterSEQTA+ settings"
  >
    <button
      type="button"
      class="settings-backdrop absolute inset-0 {expanded ? 'bg-black/60' : 'bg-transparent'} {expanded && !$settingsState.performanceMode
        ? 'backdrop-blur-sm'
        : 'backdrop-blur-none'}"
      class:settings-backdrop--motion={$settingsState.animations !== false && !$settingsState.performanceMode}
      aria-label="Close settings"
      onclick={handleClose}
    ></button>

    <div
      class="settings-panel absolute z-10 no-scrollbar overflow-clip bg-white dark:bg-zinc-800 shadow-2xl border border-zinc-200/60 dark:border-zinc-700/60"
      class:settings-panel--expanded={expanded}
      bind:this={settingsPanel}
      data-settings-panel
    >
      <div class="settings-content" bind:this={settingsContent}>
        {#if expanded}
          {@render settingsShell()}
        {:else}
          {@render compactSettings()}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-content {
    position: absolute;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
  }

  .settings-panel {
    width: min(384px, calc(100vw - 20px));
    height: min(600px, calc(100vh - 95px));
    top: min(80px, 10vh);
    right: 10px;
    border-radius: 1rem;
    transform-origin: 70% 0;
  }

  .settings-panel--expanded {
    border-radius: 0.75rem;
    transform-origin: center;
    width: min(1180px, 96vw);
    height: min(860px, 92vh);
    top: calc((100% - min(860px, 92vh)) / 2);
    right: calc((100% - min(1180px, 96vw)) / 2);
  }

  .settings-backdrop--motion {
    transition: background-color 200ms ease;
  }

  @media (prefers-reduced-motion: reduce) {
    .settings-backdrop--motion {
      transition: none;
    }
  }
</style>

{#if showColourPicker && ColourPickerComponent}
  <ColourPickerComponent
    hidePicker={() => {
      showColourPicker = false;
    }}
  />
{/if}

{#if showCloudPanel && CloudPanelComponent}
  <CloudPanelComponent
    hidePanel={() => {
      showCloudPanel = false;
    }}
  />
{/if}

{#if showFontPicker && FontPickerComponent}
  <FontPickerComponent
    hidePicker={() => {
      showFontPicker = false;
    }}
  />
{/if}

{#if showDisclaimerModal && disclaimerCallbacks && DisclaimerModalComponent}
  <DisclaimerModalComponent
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

{#if showFeedbackModal && FeedbackModalComponent}
  <FeedbackModalComponent
    initialFeedbackId={feedbackFocusId}
    onClose={() => {
      showFeedbackModal = false;
      feedbackFocusId = null;
    }}
  />
{/if}
