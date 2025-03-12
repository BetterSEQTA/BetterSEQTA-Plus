<script lang="ts">
  import TabbedContainer from '../components/TabbedContainer.svelte';
  import Settings from './settings/general.svelte';
  import Shortcuts from './settings/shortcuts.svelte';
  import Theme from './settings/theme.svelte';
  import browser from 'webextension-polyfill';

  import { standalone as StandaloneStore } from '../utils/standalone.svelte';
  import { onMount } from 'svelte'
  import { initializeSettingsState, settingsState } from '@/seqta/utils/listeners/SettingsState'

  import { closeExtensionPopup, OpenAboutPage, OpenWhatsNewPopup } from "@/plugins/monofile"
  import ColourPicker from '../components/ColourPicker.svelte'
  import { settingsPopup } from '../hooks/SettingsPopup'

  let devModeSequence = '';

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
    setTimeout(() => {
      document.removeEventListener('keydown', handleKeyDown);
      devModeSequence = '';
    }, 10000);
  };

  const openColourPicker = () => {
    showColourPicker = true;
  }

  const openChangelog = () => {
    OpenWhatsNewPopup();
    closeExtensionPopup();
  };

  const openAbout = () => {
    OpenAboutPage();
    closeExtensionPopup();
  };
    
  let { standalone } = $props<{ standalone?: boolean }>();
  let showColourPicker = $state<boolean>(false);

  onMount(() => {
    settingsPopup.addListener(() => {
      showColourPicker = false;
    });
    
    if (!standalone) return;
    initializeSettingsState();
    StandaloneStore.setStandalone(true);
  });
</script>

<div class="w-[384px] no-scrollbar shadow-2xl {$settingsState.DarkMode ? 'dark' : ''} { standalone ? 'h-[600px]' : 'h-full rounded-xl' } overflow-clip">
  <div class="flex relative flex-col gap-2 h-full overflow-clip bg-white dark:bg-zinc-800 dark:text-white">
    <div class="grid place-items-center border-b border-b-zinc-200/40">
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <img src={browser.runtime.getURL('resources/icons/betterseqta-dark-full.png')} class="w-4/5 dark:hidden" alt="Light logo" onclick={handleDevModeToggle} />
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <img src={browser.runtime.getURL('resources/icons/betterseqta-light-full.png')} class="hidden w-4/5 dark:block" alt="Dark logo" onclick={handleDevModeToggle} />
      
      {#if !standalone}
        <button onclick={openChangelog} class="absolute top-1 right-1 w-8 h-8 text-lg rounded-xl font-IconFamily bg-zinc-100 dark:bg-zinc-700">{'\ue929'}</button>
        <button onclick={openAbout} class="absolute top-1 right-10 w-8 h-8 text-lg rounded-xl font-IconFamily bg-zinc-100 dark:bg-zinc-700">{'\ueb73'}</button>
      {/if}
    </div>

    <TabbedContainer tabs={[
      { title: 'Settings', Content: Settings, props: { showColourPicker: openColourPicker } },
      { title: 'Shortcuts', Content: Shortcuts },
      { title: 'Themes', Content: Theme },
    ]} />
  </div>

  {#if showColourPicker}
    <ColourPicker hidePicker={() => { showColourPicker = false }} />
  {/if}
</div>