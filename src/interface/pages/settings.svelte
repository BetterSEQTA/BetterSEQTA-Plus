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
  import { OpenWhatsNewPopup } from "@/seqta/utils/Whatsnew";
  import { OpenMinecraftServerPopup } from "@/seqta/utils/AboutMinecraftServer";

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
            fill="#FFFFFF"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            width="16px"
            height="16px"
            ><path
              d="M 23.962891 3.0058594 A 1.50015 1.50015 0 0 0 23.314453 3.171875 L 5.8144531 12.166016 A 1.50015 1.50015 0 0 0 5 13.5 L 5 35.5 A 1.50015 1.50015 0 0 0 5.8144531 36.833984 L 23.314453 45.824219 A 1.50015 1.50015 0 0 0 24.685547 45.824219 L 42.185547 36.833984 A 1.50015 1.50015 0 0 0 43 35.5 L 43 13.5 A 1.50015 1.50015 0 0 0 42.185547 12.166016 L 24.685547 3.171875 A 1.50015 1.50015 0 0 0 23.962891 3.0058594 z M 24 6.1933594 L 40 14.416016 L 40 19.210938 L 37.279297 20.480469 C 37.103297 20.562469 36.990234 20.740547 36.990234 20.935547 L 36.992188 22.867188 C 36.992188 23.057188 36.885797 23.231406 36.716797 23.316406 L 35.505859 23.921875 C 35.173859 24.087875 34.78125 23.846609 34.78125 23.474609 L 34.78125 20.978516 C 34.78125 20.804516 34.691969 20.643734 34.542969 20.552734 C 34.395969 20.462734 34.209688 20.45325 34.054688 20.53125 L 32.283203 21.431641 C 32.115203 21.516641 32.011719 21.690906 32.011719 21.878906 L 32.011719 26.837891 C 32.011719 27.027891 31.904375 27.200156 31.734375 27.285156 L 30.693359 27.804688 C 30.361359 27.969687 29.972703 27.727422 29.970703 27.357422 L 29.960938 24.953125 C 29.960938 24.781125 29.871609 24.62125 29.724609 24.53125 C 29.578609 24.44025 29.393234 24.430813 29.240234 24.507812 L 27.28125 25.478516 C 27.11225 25.562516 27.004906 25.734828 27.003906 25.923828 L 26.992188 27.888672 C 26.991187 28.072672 26.887609 28.240172 26.724609 28.326172 L 25.234375 29.113281 C 24.900375 29.288281 24.5 29.045922 24.5 28.669922 L 24.5 27.15625 C 24.5 26.97025 24.396422 26.801844 24.232422 26.714844 L 20.746094 24.875 C 20.591094 24.793 20.405859 24.797672 20.255859 24.888672 C 20.105859 24.978672 20.012719 25.139453 20.011719 25.314453 L 20.003906 26.898438 C 20.001906 27.266437 19.616156 27.506703 19.285156 27.345703 L 18.287109 26.861328 C 18.116109 26.778328 18.007859 26.604062 18.005859 26.414062 L 17.996094 25.128906 C 17.995094 24.942906 17.890609 24.7725 17.724609 24.6875 L 15.988281 23.796875 L 15.988281 22.488281 C 15.988281 22.298281 15.880938 22.123062 15.710938 22.039062 L 12.705078 20.548828 C 12.551078 20.471828 12.368703 20.479313 12.220703 20.570312 C 12.073703 20.661313 11.984375 20.823094 11.984375 20.996094 L 11.984375 22.896484 C 11.984375 23.266484 11.595672 23.508703 11.263672 23.345703 L 10.115234 22.78125 C 9.9442344 22.69725 9.8359375 22.521078 9.8359375 22.330078 L 9.8359375 21.685547 C 9.8359375 21.492547 9.7247812 21.315422 9.5507812 21.232422 L 8 20.496094 L 8 14.416016 L 24 6.1933594 z M 37.542969 26.007812 C 37.625344 26.013687 37.706797 26.039938 37.779297 26.085938 C 37.922297 26.177937 38.009766 26.334859 38.009766 26.505859 L 38.009766 28.451172 L 38.007812 28.451172 C 38.007812 28.639172 37.902328 28.810484 37.736328 28.896484 L 35.728516 29.927734 C 35.656516 29.964734 35.579 29.982422 35.5 29.982422 C 35.41 29.982422 35.319234 29.958156 35.240234 29.910156 C 35.092234 29.820156 35.002 29.660328 35 29.486328 L 34.984375 27.4375 C 34.983375 27.2405 35.098344 27.060516 35.277344 26.978516 L 37.300781 26.050781 C 37.377781 26.015281 37.460594 26.001938 37.542969 26.007812 z M 13.458984 28.021484 C 13.541484 28.015734 13.626125 28.029453 13.703125 28.064453 L 15.726562 28.992188 C 15.905563 29.074188 16.018578 29.255172 16.017578 29.451172 L 16.001953 31.501953 C 16.000953 31.674953 15.910719 31.835781 15.761719 31.925781 C 15.682719 31.973781 15.591953 31.998047 15.501953 31.998047 C 15.423953 31.998047 15.345438 31.979359 15.273438 31.943359 L 13.265625 30.912109 C 13.098625 30.826109 12.994141 30.654797 12.994141 30.466797 L 12.994141 28.519531 C 12.994141 28.349531 13.081609 28.191609 13.224609 28.099609 C 13.296609 28.053609 13.376484 28.027234 13.458984 28.021484 z M 32.546875 30.019531 C 32.629125 30.025281 32.70875 30.053109 32.78125 30.099609 C 32.92425 30.191609 33.011719 30.348531 33.011719 30.519531 L 33.011719 32.466797 C 33.011719 32.654797 32.906234 32.824156 32.740234 32.910156 L 30.732422 33.941406 C 30.660422 33.978406 30.582906 33.996094 30.503906 33.996094 C 30.413906 33.996094 30.323141 33.973781 30.244141 33.925781 C 30.095141 33.835781 30.004906 33.675953 30.003906 33.501953 L 29.988281 31.451172 C 29.987281 31.254172 30.100297 31.074187 30.279297 30.992188 L 32.302734 30.064453 C 32.380234 30.028953 32.464625 30.013781 32.546875 30.019531 z"
            /></svg
          >
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
