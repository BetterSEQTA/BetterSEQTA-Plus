<script lang="ts">
  // Import necessary components and utilities
  import MotionDiv from '@/interface/components/MotionDiv.svelte';
  import { settingsState } from "@/seqta/utils/listeners/SettingsState.ts"
  import Switch from "@/interface/components/Switch.svelte"
  import { onMount } from 'svelte';
  import Shortcuts from "@/seqta/content/links.json"

  // Declare state variable to track if settings are loaded
  let isLoaded = $state(false);

  // Wait for settingsState to be initialized on mount
  onMount(async () => {
    await new Promise<void>((resolve) => {
      const checkState = () => {
        // Check if the shortcuts data is available in settingsState
        if ($settingsState?.shortcuts) {
          isLoaded = true; // Mark as loaded
          resolve(); // Resolve promise
        } else {
          setTimeout(checkState, 100); // Retry every 100ms
        }
      };
      checkState(); // Call checkState
    });
  });

  // Handle toggle switch change for shortcuts
  const switchChange = (shortcut: any) => {    
    const value = $settingsState.shortcuts.find(s => s.name === shortcut);
    if (value) {
      // Toggle the 'enabled' status of the shortcut
      value.enabled = !value.enabled;
      settingsState.shortcuts = settingsState.shortcuts; // Update state
    } else {
      // If the shortcut is not found, add it to the list with enabled set to true
      settingsState.shortcuts = [...settingsState.shortcuts, { name: shortcut, enabled: true }];
    }
  }

  // State variables for managing form visibility and new shortcut data
  let isFormVisible = $state(false);
  let newTitle = $state("");
  let newURL = $state("");

  // Toggle visibility of the new shortcut form
  const toggleForm = () => {
    isFormVisible = !isFormVisible;
  };

  // Format URL by adding https if no protocol is provided
  const formatUrl = (inputUrl: string) => {
    const protocolRegex = /^(http:\/\/|https:\/\/|ftp:\/\/)/;
    return protocolRegex.test(inputUrl) ? inputUrl : `https://${inputUrl}`;
  };

  // Check if the title is valid (not an empty string)
  const isValidTitle = (title: string) => title.trim() !== "";
  
  // Check if the URL matches a valid pattern
  const isValidURL = (url: string) => {
    const pattern = new RegExp("^(https?:\\/\\/)?[\\w.-]+(?:\\.[\\w\\-]+)*(?::\\d+)?(/[\\w\\-./]*)*$", "i");
    return pattern.test(url);
  };

  // Add a new custom shortcut to the settings
  const addNewCustomShortcut = () => {
    if (isValidTitle(newTitle) && isValidURL(newURL)) {
      // Create a new shortcut object
      const newShortcut = { name: newTitle.trim(), url: formatUrl(newURL).trim(), icon: newTitle[0] };
      settingsState.customshortcuts = [...settingsState.customshortcuts, newShortcut]; // Add to custom shortcuts

      // Reset form values and hide the form
      newTitle = "";
      newURL = "";
      isFormVisible = false;
    } else {
      // Alert the user if title or URL is invalid
      alert("Please enter a valid title and URL.");
    }
  };

  // Delete a custom shortcut based on its index
  const deleteCustomShortcut = (index: number) => {
    settingsState.customshortcuts = settingsState.customshortcuts.filter((_, i) => i !== index);
  };
</script>

<!-- Main component structure -->
<div class="flex flex-col pt-4 divide-y divide-zinc-100 dark:divide-zinc-700">
  {#if isLoaded} <!-- Only render if data is loaded -->
    <div>
      <!-- MotionDiv for animated form visibility -->
      <MotionDiv
        initial={{ opacity: 0, height: 0 }}
        animate={isFormVisible ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{
          type: 'spring',
          config: { stiffness: 400, damping: 25 }
        }}
      >
        {#if isFormVisible}
          <!-- New Shortcut Form -->
          <div class="flex flex-col items-center">
            <MotionDiv
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0, duration: 0.2 }}
              class="w-full"
            >
              <!-- Shortcut Title Input -->
              <input
                class="p-2 w-full rounded-lg border-0 transition placeholder-zinc-300 bg-zinc-100 dark:bg-zinc-700 focus:bg-zinc-200/50 dark:focus:bg-zinc-600"
                type="text"
                placeholder="Shortcut Name"
                bind:value={newTitle}
              />
            </MotionDiv>
            <MotionDiv
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.2 }}
              class="w-full"
            >
              <!-- Shortcut URL Input -->
              <input
                class="p-2 my-2 w-full rounded-lg border-0 transition placeholder-zinc-300 bg-zinc-100 dark:bg-zinc-700 focus:bg-zinc-200/50 dark:focus:bg-zinc-600"
                type="text"
                placeholder="URL eg. https://google.com"
                bind:value={newURL}
              />
            </MotionDiv>
          </div>
        {/if}
      </MotionDiv>

      <!-- Add/Toggle Button for the form -->
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button
          class="w-full px-4 py-2 mb-4 text-[13px] dark:text-white transition rounded-xl bg-zinc-200 dark:bg-zinc-700/50"
          onclick={isFormVisible ? addNewCustomShortcut : toggleForm}
        >
          {#if isFormVisible}
            Add
          {:else}
            Add Custom Shortcut
          {/if}
        </button>
      </MotionDiv>
    </div>

    <!-- Render predefined shortcuts -->
    {#each Object.entries(Shortcuts) as shortcut}
      <div class="flex justify-between items-center px-4 py-3">
        <div class="pr-4">
          <!-- Display the shortcut name (DisplayName or fallback to key) -->
          <h2 class="text-sm">{shortcut[1].DisplayName || shortcut[0]}</h2>
        </div>
        <Switch state={$settingsState.shortcuts.find(s => s.name === shortcut[0])?.enabled ?? false} onChange={() => switchChange(shortcut[0])} />
      </div>
    {/each}

    <!-- Render custom shortcuts section -->
    {#each $settingsState.customshortcuts as shortcut, index}
      <div class="flex justify-between items-center px-4 py-3">
        {shortcut.name}
        <!-- Delete button for custom shortcut -->
        <button aria-label="Delete Shortcut" onclick={() => deleteCustomShortcut(index)}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    {/each}
  {:else}
    <!-- Loading message while shortcuts are being loaded -->
    <div class="p-4 text-center">
      Loading shortcuts...
    </div>
  {/if}
</div>
