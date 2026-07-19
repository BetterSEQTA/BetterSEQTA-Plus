<script lang="ts">
  import TabbedContainer from "../components/TabbedContainer.svelte";
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

  let devModeSequence = "";
  let settingsActiveTab = $state(0);
  let showDisclaimerModal = $state(false);
  let disclaimerCallbacks = $state<{ onConfirm: () => void, onCancel: () => void } | null>(null);
  let disclaimerTitle = $state("Confirm");
  let disclaimerMessage = $state("");
  const ghReleaseUpdateEnabled = isGhReleaseUpdateCheckEnabled();
  const ghReleaseChannelLabel = getInstalledGhReleaseChannelLabel();
  let ghReleaseUpdate = $state<GhReleaseUpdateInfo | null>(null);

  const openGhRelease = () => {
    const url = ghReleaseUpdate?.url
      ?? "https://github.com/BetterSEQTA/BetterSEQTA-Plus/releases";
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
  });

  onDestroy(() => {
    settingsPopup.removeListener(closePopupsOnSettingsClose);
  });
</script>

<div
  class="relative w-[384px] no-scrollbar shadow-2xl {$settingsState.DarkMode
    ? 'dark'
    : ''} {standalone ? 'h-[600px]' : 'h-full rounded-xl'} overflow-clip"
>
  <div
    class="flex relative flex-col gap-2 h-full min-h-0 overflow-hidden bg-white dark:bg-zinc-800 dark:text-white"
  >
    <div
      class="grid shrink-0 place-items-center border-b border-b-zinc-200/40 dark:border-b-zinc-700/40"
    >
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <img
        src={browser.runtime.getURL(
          "resources/icons/betterseqta-dark-full.png",
        )}
        class="w-4/5 dark:hidden"
        alt="Light logo"
        onclick={handleDevModeToggle}
      />
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <img
        src={browser.runtime.getURL(
          "resources/icons/betterseqta-light-full.png",
        )}
        class="hidden w-4/5 dark:block"
        alt="Dark logo"
        onclick={handleDevModeToggle}
      />

      {#if !standalone}
        <div class="flex absolute top-1 right-1 gap-1 items-start">
          {#if ghReleaseUpdateEnabled}
            <div class="flex flex-col items-end gap-0.5 max-w-[9rem] mr-0.5">
              {#if ghReleaseUpdate?.available}
                <button
                  type="button"
                  onclick={openGhRelease}
                  class="px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-white rounded-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
                  title="Open GitHub release"
                >
                  Update available — {ghReleaseUpdate.label}
                </button>
              {/if}
              <p class="text-[9px] leading-tight text-right text-zinc-500 dark:text-zinc-400">
                {#if ghReleaseChannelLabel}
                  {ghReleaseChannelLabel} — do not upload to extension stores.
                {:else}
                  GitHub release build — do not upload to extension stores.
                {/if}
              </p>
            </div>
          {/if}
          <div class="flex gap-1 items-center">
          <button
            onclick={openAbout}
            class="flex justify-center items-center w-8 h-8 text-lg rounded-xl font-IconFamily bg-zinc-100 dark:bg-zinc-700"
          >
            {"\ueb73"}
          </button>

          <button
            onclick={openChangelog}
            class="flex justify-center items-center w-8 h-8 text-lg rounded-xl font-IconFamily bg-zinc-100 dark:bg-zinc-700"
          >
            {"\ue929"}
          </button>

          <button
            onclick={openPrivacyStatement}
            class="flex justify-center items-center w-8 h-8 text-lg rounded-xl font-IconFamily bg-zinc-100 dark:bg-zinc-700"
            aria-label="Privacy Statement"
          >
            {"\uecba"}
          </button>
          </div>
        </div>
      {/if}
    </div>

    <div class="flex-1 min-h-0 overflow-hidden">
      <TabbedContainer
        bind:activeTab={settingsActiveTab}
        tabs={[
          {
            title: "Settings",
            Content: Settings,
            props: { showColourPicker: openColourPicker, showFontPicker: openFontPicker, showDisclaimer, showCloudPanel: openCloudPanel },
          },
          { title: "Shortcuts", Content: Shortcuts },
          { title: "Themes", Content: Theme },
        ]}
      />
    </div>
  </div>

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
</div>

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
