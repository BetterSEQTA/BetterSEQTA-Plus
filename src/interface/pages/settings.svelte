<script lang="ts">
  import TabbedContainer from "../components/TabbedContainer.svelte";
  import Settings from "./settings/general.svelte";
  import Shortcuts from "./settings/shortcuts.svelte";
  import Theme from "./settings/theme.svelte";
  import browser from "webextension-polyfill";

  import { standalone as StandaloneStore } from "../utils/standalone.svelte";
  import { onMount } from "svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";

  import { closeExtensionPopup } from "@/seqta/utils/Closers/closeExtensionPopup";
  import { OpenAboutPage } from "@/seqta/utils/Openers/OpenAboutPage";
  import { OpenWhatsNewPopup } from "@/seqta/utils/Openers/OpenWhatsNewPopup";
  import { OpenMinecraftServerPopup } from "@/seqta/utils/Openers/OpenMinecraftServerPopup";

  import ColourPicker from "../components/ColourPicker.svelte";
  import { settingsPopup } from "../hooks/SettingsPopup";

  let devModeSequence = "";

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

  const openColourPicker = () => {
    showColourPicker = true;
  };

  const openChangelog = () => {
    OpenWhatsNewPopup();
    closeExtensionPopup();
  };

  const openAbout = () => {
    OpenAboutPage();
    closeExtensionPopup();
  };

  const openMinecraftServer = () => {
    OpenMinecraftServerPopup();
    closeExtensionPopup();
  };

  let { standalone } = $props<{ standalone?: boolean }>();
  let showColourPicker = $state<boolean>(false);

  onMount(async () => {
    settingsPopup.addListener(() => {
      showColourPicker = false;
    });

    if (!standalone) return;
    StandaloneStore.setStandalone(true);
  });
</script>

<div
  class="w-[384px] no-scrollbar shadow-2xl {$settingsState.DarkMode
    ? 'dark'
    : ''} {standalone ? 'h-[600px]' : 'h-full rounded-xl'} overflow-clip"
>
  <div
    class="flex relative flex-col gap-2 h-full overflow-clip bg-white dark:bg-zinc-800 dark:text-white"
  >
    <div
      class="grid place-items-center border-b border-b-zinc-200/40 dark:border-b-zinc-700/40"
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
        <button
          onclick={openAbout}
          class="absolute top-1 right-[62px] w-8 h-8 text-lg rounded-xl font-IconFamily bg-zinc-100 dark:bg-zinc-700"
        >
          {"\ueb73"}
        </button>

        <button
          onclick={openChangelog}
          class="absolute top-1 right-10 w-8 h-8 text-lg rounded-xl font-IconFamily bg-zinc-100 dark:bg-zinc-700"
        >
          {"\ue929"}
        </button>

        <button
          onclick={openMinecraftServer}
          class="absolute top-1 right-1 w-8 h-8 bg-zinc-100 dark:bg-zinc-700 rounded-xl p-1"
          aria-label="Open Minecraft Server"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 70"
            fill="none"
            class="w-full h-full"
          >
            <path
              d="M0 0 C3.96 0 7.92 0 12 0 C12 3.96 12 7.92 12 12 C10.68 12 9.36 12 8 12 C8 10.68 8 9.36 8 8 C6.68 8 5.36 8 4 8 C4 6.68 4 5.36 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(42,10)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 6.6 4 13.2 4 20 C2.68 20 1.36 20 0 20 C0 13.4 0 6.8 0 0 Z "
              fill="currentColor"
              transform="translate(54,22)"
            />
            <path
              d="M0 0 C6.6 0 13.2 0 20 0 C20 1.32 20 2.64 20 4 C13.4 4 6.8 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(22,6)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 5.28 4 10.56 4 16 C2.68 16 1.36 16 0 16 C0 10.72 0 5.44 0 0 Z "
              fill="currentColor"
              transform="translate(46,26)"
            />
            <path
              d="M0 0 C5.28 0 10.56 0 16 0 C16 1.32 16 2.64 16 4 C10.72 4 5.44 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(22,14)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C5.32 4 6.64 4 8 4 C8 5.32 8 6.64 8 8 C5.36 8 2.72 8 0 8 C0 5.36 0 2.72 0 0 Z "
              fill="currentColor"
              transform="translate(6,50)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(14,50)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(18,46)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(10,46)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(50,42)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(22,42)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(14,42)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(26,38)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(18,38)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(30,34)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(22,34)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(34,30)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(26,30)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(38,26)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(30,26)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(42,22)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(34,22)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(38,18)"
            />
            <path
              d="M0 0 C1.32 0 2.64 0 4 0 C4 1.32 4 2.64 4 4 C2.68 4 1.36 4 0 4 C0 2.68 0 1.36 0 0 Z "
              fill="currentColor"
              transform="translate(18,10)"
            />
          </svg>
        </button>
      {/if}
    </div>

    <TabbedContainer
      tabs={[
        {
          title: "Settings",
          Content: Settings,
          props: { showColourPicker: openColourPicker },
        },
        { title: "Shortcuts", Content: Shortcuts },
        { title: "Themes", Content: Theme },
      ]}
    />
  </div>

  {#if showColourPicker}
    <ColourPicker
      hidePicker={() => {
        showColourPicker = false;
      }}
    />
  {/if}
</div>
