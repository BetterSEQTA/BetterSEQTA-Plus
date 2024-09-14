<script lang="ts">
  import logo from '@/resources/icons/betterseqta-dark-full.png';
  import logoDark from '@/resources/icons/betterseqta-light-full.png';
  import browser from 'webextension-polyfill';

  // Props
  let { searchTerm, setSearchTerm, darkMode } = $props<{ searchTerm: string, setSearchTerm: (term: string) => void, darkMode: boolean }>();

  // Clear search input function
  const clearSearch = () => {
    setSearchTerm('');
  };
</script>

<header class="fixed top-0 z-50 w-full h-[4.25rem] bg-white border-b shadow-md border-b-white/10 dark:bg-zinc-950/90 backdrop-blur-xl dark:text-white">
  <div class="flex items-center justify-between px-4 py-1">
    <div class="flex gap-4 cursor-pointer place-items-center" onkeydown={(e) => { if (e.key === 'Enter') clearSearch() }} onclick={clearSearch} role="button" tabindex="0">
      <img src={browser.runtime.getURL(logo)} class="h-14 {darkMode ? 'hidden' : ''}" alt="Logo" />
      <img src={browser.runtime.getURL(logoDark)} class="h-14 {darkMode ? '' : 'hidden'}" alt="Dark Logo" />

      <div class="w-[1px] h-10 my-auto bg-zinc-400 dark:bg-zinc-600"></div>

      <h1 class="text-xl font-semibold">Theme Store</h1>
    </div>

    <div class="relative flex gap-2">
      <input
        type="text"
        placeholder="Search themes..."
        value={searchTerm}
        oninput={(e: any) => setSearchTerm(e.target.value)}
        class="px-4 py-2 pl-10 text-lg transition bg-gray-100/80 rounded-lg ring-0 focus:bg-gray-100/0 dark:focus:bg-zinc-700/50 focus:ring-[1px] ring-zinc-200 dark:ring-zinc-600 dark:bg-zinc-700/80 dark:text-gray-100 focus:outline-none focus:border-transparent" />
      <svg
        class="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2 dark:text-gray-200"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        stroke="currentColor">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
    </div>
  </div>
</header>