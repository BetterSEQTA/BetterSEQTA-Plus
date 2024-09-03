<script lang="ts">
  import TabbedContainer from '../components/TabbedContainer.svelte';
  import Settings from './settings/general.svelte';
  import Shortcuts from './settings/shortcuts.svelte';
  import Theme from './settings/theme.svelte';
  /* import Picker from './components/Picker.svelte'; */
  import browser from 'webextension-polyfill';

  const openChangelog = () => {
    browser.runtime.sendMessage({ type: 'currentTab', info: 'OpenChangelog' });
  };
    
  let standalone = false;
</script>

<div class="relative flex flex-col w-[384px] shadow-2xl gap-2 bg-white {standalone ? '' : 'rounded-xl'} h-[100vh] overflow-clip dark:bg-zinc-800 dark:text-white">
  <div class="grid border-b border-b-zinc-200/40 place-items-center">
    <img src={browser.runtime.getURL('resources/icons/betterseqta-dark-full.png')} class="w-4/5 dark:hidden" alt="Light logo" />
    <img src={browser.runtime.getURL('resources/icons/betterseqta-light-full.png')} class="hidden w-4/5 dark:block" alt="Dark logo" />
    <button on:click={openChangelog} class="absolute w-8 h-8 text-lg rounded-xl font-IconFamily top-1 right-1 bg-zinc-100 dark:bg-zinc-700"></button>
  </div>
  <!-- <Picker /> -->
  <TabbedContainer tabs={[
    { title: 'Settings', Content: Settings },
    { title: 'Shortcuts', Content: Shortcuts },
    { title: 'Themes', Content: Theme },
  ]} />
</div>