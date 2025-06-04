<script lang="ts">
  import MotionDiv from '@/interface/components/MotionDiv.svelte';
  import { settingsState } from "@/seqta/utils/listeners/SettingsState.ts"
  import Switch from "@/interface/components/Switch.svelte"
  import { onMount } from 'svelte';
  import Shortcuts from "@/seqta/content/links.json"

  let isLoaded = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);

  onMount(async () => {
    // Wait for settingsState to be initialized
    await new Promise<void>((resolve) => {
      const checkState = () => {
        if ($settingsState?.shortcuts) {
          isLoaded = true;
          resolve();
        } else {
          setTimeout(checkState, 100);
        }
      };
      checkState();
    });
  });

  const switchChange = (shortcut: any) => {    
    const value = $settingsState.shortcuts.find(s => s.name === shortcut);
    if (value) {
      value.enabled = !value.enabled;
      settingsState.shortcuts = settingsState.shortcuts;
    } else {
      settingsState.shortcuts = [...settingsState.shortcuts, { name: shortcut, enabled: true }];
    }
  }

  let isFormVisible = $state(false);
  let newTitle = $state("");
  let newURL = $state("");
  let newIcon = $state<string | null>(null);

  function handleIconChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && file.type === "image/svg+xml") {
      const reader = new FileReader();
      reader.onload = () => {
        newIcon = reader.result as string;
      };
      reader.readAsText(file);
    }
  }

  const clearIcon = () => {
    newIcon = null;
    if (fileInput) {
      fileInput.value = ""; // Clear the file input so the same file can be re-selected
    }
  };

  const toggleForm = () => {
    isFormVisible = !isFormVisible;
  };

  const formatUrl = (inputUrl: string) => {
    const protocolRegex = /^(http:\/\/|https:\/\/|ftp:\/\/)/;
    return protocolRegex.test(inputUrl) ? inputUrl : `https://${inputUrl}`;
  };

  const isValidTitle = (title: string) => title.trim() !== "";
  
  const isValidURL = (url: string) => {
    const pattern = new RegExp("^(https?:\\/\\/)?[\\w.-]+(?:\\.[\\w\\-]+)*(?::\\d+)?(/[\\w\\-./]*)*$", "i");
    return pattern.test(url);
  };

  const addNewCustomShortcut = () => {
    if (isValidTitle(newTitle) && isValidURL(newURL)) {
      const icon = newIcon || newTitle[0];
      const newShortcut = { name: newTitle.trim(), url: formatUrl(newURL).trim(), icon };
      settingsState.customshortcuts = [...settingsState.customshortcuts, newShortcut];

      newTitle = "";
      newURL = "";
      newIcon = null;
      isFormVisible = false;
    } else {
      alert("Please enter a valid title and URL.");
    }
  };

  const deleteCustomShortcut = (index: number) => {
    settingsState.customshortcuts = settingsState.customshortcuts.filter((_, i) => i !== index);
  };
</script>

<div class="flex flex-col pt-4 divide-y divide-zinc-100 dark:divide-zinc-700">
  {#if isLoaded}
    <div>
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
          <div class="flex flex-col items-center">
            <MotionDiv
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0, duration: 0.2 }}
              class="w-full"
            >
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
              class="flex gap-2 w-full"
            >
                <input
                  class="p-2 my-2 w-full rounded-lg border-0 transition placeholder-zinc-300 bg-zinc-100 dark:bg-zinc-700 focus:bg-zinc-200/50 dark:focus:bg-zinc-600"
                  type="text"
                  placeholder="URL eg. https://google.com"
                  bind:value={newURL}
                />
                <input
                  bind:this={fileInput}
                  class="p-2 w-full rounded-lg border-0 transition placeholder-zinc-300 bg-zinc-100 dark:bg-zinc-700 focus:bg-zinc-200/50 dark:focus:bg-zinc-600"
                  type="file"
                  accept=".svg"
                  onchange={handleIconChange}
                  hidden
                />
                <button
                  type="button"
                  class="flex justify-between items-center p-2 my-2 text-left rounded-lg border border-dashed transition text-nowrap text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700/50 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 focus:bg-zinc-200/50 dark:focus:bg-zinc-600/50 border-zinc-300 dark:border-zinc-600"
                  onclick={() => fileInput?.click()}
                >
                  {#if newIcon}
                    <div class="flex overflow-hidden items-center">
                      <div class="flex-shrink-0 mr-2 w-6 h-6">
                        <img src={`data:image/svg+xml;base64,${btoa(newIcon)}`} alt="Selected Icon" class="object-contain w-full h-full" />
                      </div>
                      <span class="truncate">Selected Icon</span>
                    </div>
                    <span
                      class="p-1 ml-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600"
                      aria-label="Clear icon"
                      role="button"
                      tabindex="0"
                      onclick={(event) => { event.stopPropagation(); clearIcon(); }}
                      onkeydown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          clearIcon();
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                  {:else}
                    <span class="font-IconFamily">{ '\ued47' }</span>
                    <span class="ml-2">SVG icon <span class="text-xs italic text-zinc-400 dark:text-zinc-500">(Optional)</span></span>
                  {/if}
                </button>
            </MotionDiv>
          </div>
        {/if}
      </MotionDiv>

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

    {#each Object.entries(Shortcuts) as shortcut}
      <div class="flex justify-between items-center px-4 py-3">
        <div class="pr-4">
          <!-- Use DisplayName if it exists, otherwise use the key (shortcut[0]) as a fallback -->
          <h2 class="text-sm">{shortcut[1].DisplayName || shortcut[0]}</h2>
        </div>
        <Switch state={$settingsState.shortcuts.find(s => s.name === shortcut[0])?.enabled ?? false} onChange={() => switchChange(shortcut[0])} />
      </div>
    {/each}

    <!-- Custom Shortcuts Section -->
    {#each $settingsState.customshortcuts as shortcut, index}
      <div class="flex justify-between items-center px-4 py-3">
        {shortcut.name}
        <button aria-label="Delete Shortcut" onclick={() => deleteCustomShortcut(index)}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    {/each}
  {:else}
    <div class="p-4 text-center">
      Loading shortcuts...
    </div>
  {/if}
</div>
