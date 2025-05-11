<script lang="ts">
  // Import UI components and settings pages
  import TabbedContainer from '../components/TabbedContainer.svelte';
  import Settings from './settings/general.svelte';
  import Shortcuts from './settings/shortcuts.svelte';
  import Theme from './settings/theme.svelte';
  import browser from 'webextension-polyfill';

  // Import utilities and stores
  import { standalone as StandaloneStore } from '../utils/standalone.svelte';
  import { onMount } from 'svelte'
  import { initializeSettingsState, settingsState } from '@/seqta/utils/listeners/SettingsState'

  import { closeExtensionPopup } from "@/seqta/utils/Closers/closeExtensionPopup"
  import { OpenAboutPage } from "@/seqta/utils/Openers/OpenAboutPage"
  import { OpenWhatsNewPopup } from "@/seqta/utils/Whatsnew"

  import ColourPicker from '../components/ColourPicker.svelte'
  import { settingsPopup } from '../hooks/SettingsPopup'

  let devModeSequence = ''; // Holds the input sequence for toggling dev mode

  // Function to enable dev mode if user types 'dev'
  const handleDevModeToggle = () => {
    const handleKeyDown = (event: KeyboardEvent) => {
      devModeSequence += event.key.toLowerCase();
      if (devModeSequence.includes('dev')) {
        document.removeEventListener('keydown', handleKeyDown);
        settingsState.devMode = true;
        alert('Dev mode is now enabled');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Remove listener after 10 seconds if sequence not completed
    setTimeout(() => {
      document.removeEventListener('keydown', handleKeyDown);
      devModeSequence = '';
    }, 10000);
  };

  // Show the colour picker
  const openColourPicker = () => {
    showColourPicker = true;
  }

  // Open changelog and close popup
  const openChangelog = () => {
    OpenWhatsNewPopup();
    closeExtensionPopup();
  };

  // Open about page and close popup
  const openAbout = () => {
    OpenAboutPage();
    closeExtensionPopup();
  };
    
  // Props passed to component
  let { standalone } = $props<{ standalone?: boolean }>();
  let showColourPicker = $state<boolean>(false); // State to toggle colour picker visibility

  // On component mount
  onMount(() => {
    // Hide colour picker when settings popup is closed
    settingsPopup.addListener(() => {
      showColourPicker = false;
    });

    // Only run initialization in standalone mode
    if (!standalone) return;
    initializeSettingsState(); // Initialize settings state
    console.log('settingsState', $settingsState); // Debug log
    StandaloneStore.setStandalone(true); // Update store to reflect standalone mode
  });
</script>

<!-- Main container with dynamic height and dark mode styling -->
<div class="w-[384px] no-scrollbar shadow-2xl {$settingsState.DarkMode ? 'dark' : ''} { standalone ? 'h-[600px]' : 'h-full rounded-xl' } overflow-clip">
  <div class="flex relative flex-col gap-2 h-full overflow-clip bg-white dark:bg-zinc-800 dark:text-white">
    <!-- Header section with logo and optional buttons -->
    <div class="grid place-items-center border-b border-b-zinc-200/40 dark:border-b-zinc-700/40">
      <!-- Clickable logo to toggle dev mode -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <img src={browser.runtime.getURL('resources/icons/betterseqta-dark-full.png')} class="w-4/5 dark:hidden" alt="Light logo" onclick={handleDevModeToggle} />
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <img src={browser.runtime.getURL('resources/icons/betterseqta-light-full.png')} class="hidden w-4/5 dark:block" alt="Dark logo" onclick={handleDevModeToggle} />
      
      {#if !standalone}
        <!-- Button to open changelog -->
        <button onclick={openChangelog} class="absolute top-1 right-1 w-8 h-8 text-lg rounded-xl font-IconFamily bg-zinc-100 dark:bg-zinc-700">{'\ue929'}</button>
        <!-- Button to open about page -->
        <button onclick={openAbout} class="absolute top-1 right-10 w-8 h-8 text-lg rounded-xl font-IconFamily bg-zinc-100 dark:bg-zinc-700">{'\ueb73'}</button>
      {/if}
    </div>

    <!-- Tabbed settings container with Settings, Shortcuts, and Theme tabs -->
    <TabbedContainer tabs={[
      { title: 'Settings', Content: Settings, props: { showColourPicker: openColourPicker } },
      { title: 'Shortcuts', Content: Shortcuts },
      { title: 'Themes', Content: Theme },
    ]} />
  </div>

  {#if showColourPicker}
    <!-- Colour picker component shown conditionally -->
    <ColourPicker hidePicker={() => { showColourPicker = false }} />
  {/if}
</div>
