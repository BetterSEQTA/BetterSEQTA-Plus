<script lang="ts">
  import TabbedContainer from '../components/TabbedContainer.svelte';
  import Settings from './settings/general.svelte';
  import Shortcuts from './settings/shortcuts.svelte';
  import Theme from './settings/theme.svelte';
  import browser from 'webextension-polyfill';

  import { createStandalone } from '../utils/standalone.svelte';
  import { onMount } from 'svelte'
  import { settingsState } from '@/seqta/utils/listeners/SettingsState'

  import { closeExtensionPopup, OpenAboutPage, OpenWhatsNewPopup } from "@/SEQTA"
  import ColourPicker from '../components/ColourPicker.svelte'
  import { settingsPopup } from '../hooks/SettingsPopup'


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
    
  let { standalone = false } = $props<{ standalone?: boolean }>();
  let showColourPicker = $state<boolean>(false);

  onMount(() => {
    settingsPopup.addListener(() => {
      showColourPicker = false;
    });
    
    if (!standalone) return;
    // @ts-ignore
    let globalStandalone = createStandalone();
    globalStandalone = standalone;

  });
</script>

<div class="w-[384px] shadow-2xl {$settingsState.DarkMode ? 'dark' : ''} { standalone ? 'h-[600px]' : 'h-full rounded-xl' } overflow-clip">
  <div class="relative flex flex-col h-full gap-2 bg-white overflow-clip dark:bg-zinc-800 dark:text-white">
    <div class="grid border-b border-b-zinc-200/40 place-items-center">
      <img src={browser.runtime.getURL('resources/icons/betterseqta-dark-full.png')} class="w-4/5 dark:hidden" alt="Light logo" />
      <img src={browser.runtime.getURL('resources/icons/betterseqta-light-full.png')} class="hidden w-4/5 dark:block" alt="Dark logo" />
      <button onclick={openChangelog} class="absolute right-0 w-8 h-8 text-lg rounded-xl font-IconFamily top-1 bg-zinc-100 dark:bg-zinc-700"></button>
      <button onclick={openAbout} class="absolute w-8 h-8 text-lg rounded-xl font-IconFamily top-1 right-10 bg-zinc-100 dark:bg-zinc-700">ⓘ</button>
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