<script lang="ts">
  // Importing assets and utilities
  import logo from '@/resources/icons/betterseqta-dark-full.png'; // Light mode logo
  import logoDark from '@/resources/icons/betterseqta-light-full.png'; // Dark mode logo
  import { closeStore } from '@/seqta/ui/renderStore'; // Function to close the store
  import browser from 'webextension-polyfill'; // Browser extension API

  // Props to be passed into the component
  let { searchTerm, setSearchTerm, darkMode, activeTab, setActiveTab } = $props<{
    searchTerm: string, // Search term state
    setSearchTerm: (term: string) => void, // Function to update the search term
    darkMode: boolean, // Dark mode state
    activeTab: string, // Active tab name (themes or backgrounds)
    setActiveTab: (tab: string) => void // Function to set the active tab
  }>();

  // Function to clear the search input field
  const clearSearch = () => {
    setSearchTerm(''); // Reset the search term to empty string
  };
</script>

<header class="fixed top-0 z-50 w-full h-[4.25rem] bg-white border-b shadow-md border-b-white/10 dark:bg-zinc-950/90 backdrop-blur-xl dark:text-white">
  <div class="flex justify-between items-center px-4 py-1">
    <!-- Logo and navigation bar -->
    <div class="flex gap-4 place-items-center cursor-pointer" onkeydown={(e) => { if (e.key === 'Enter') clearSearch() }} onclick={clearSearch} role="button" tabindex="0">
      <!-- Display the appropriate logo based on dark mode state -->
      <img src={browser.runtime.getURL(logo)} class="h-14 {darkMode ? 'hidden' : ''}" alt="Logo" />
      <img src={browser.runtime.getURL(logoDark)} class="h-14 {darkMode ? '' : 'hidden'}" alt="Dark Logo" />

      <!-- Vertical divider between the logo and buttons -->
      <div class="w-[1px] h-10 my-auto bg-zinc-400 dark:bg-zinc-600"></div>

      <!-- Button to switch to the 'themes' tab -->
      <button
        class="px-4 py-2 font-semibold text-lg transition-colors duration-200 {activeTab === 'themes' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400'}"
        onclick={() => setActiveTab('themes')}
      >
        Themes
      </button>

      <!-- Button to switch to the 'backgrounds' tab -->
      <button
        class="px-4 py-2 font-semibold text-lg transition-colors duration-200 {activeTab === 'backgrounds' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400'}"
        onclick={() => setActiveTab('backgrounds')}
      >
        Backgrounds
      </button>
    </div>

    <!-- Search and close section -->
    <div class="flex relative gap-2">
      <!-- Search input field -->
      <input
        type="text"
        placeholder="Search themes..."
        value={searchTerm} // Bind the search term value
        oninput={(e: any) => setSearchTerm(e.target.value)} // Update the search term on input change
        class="px-4 py-2 pl-10 text-lg transition bg-gray-100/80 rounded-lg ring-0 focus:bg-gray-100/0 dark:focus:bg-zinc-700/50 focus:ring-[1px] ring-zinc-200 dark:ring-zinc-600 dark:bg-zinc-700/80 dark:text-gray-100 focus:outline-none focus:border-transparent" />
        
      <!-- Search icon inside the input -->
      <svg
        class="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2 dark:text-gray-200"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        stroke="currentColor">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>

      <!-- Close button that triggers the store closing -->
      <button
        onclick={closeStore}
        class="p-1 px-3"
      >
        <span class="text-2xl font-IconFamily">&#xed8a;</span> <!-- Close icon -->
      </button>
    </div>
  </div>
</header>
