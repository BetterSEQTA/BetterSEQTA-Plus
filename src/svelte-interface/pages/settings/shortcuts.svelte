<script lang="ts">
  // @ts-expect-error umm idk
  import { MotionDiv } from 'svelte-motion';
  import { settingsState } from "@/seqta/utils/listeners/SettingsState.ts"
  import Switch from "@/svelte-interface/components/Switch.svelte"

  const switchChange = (index: number) => {    
    const updatedShortcuts = [...settingsState.shortcuts];
    updatedShortcuts[index].enabled = !updatedShortcuts[index].enabled;
    settingsState.shortcuts = updatedShortcuts;
  }

  let isFormVisible = $state(false);
  let newTitle = $state("");
  let newURL = $state("");

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
      const newShortcut = { name: newTitle.trim(), url: formatUrl(newURL).trim(), icon: newTitle[0] };
      settingsState.customshortcuts = [...settingsState.customshortcuts, newShortcut];

      newTitle = "";
      newURL = "";
      isFormVisible = false;
    } else {
      alert("Please enter a valid title and URL.");
    }
  };

  const deleteCustomShortcut = (index: number) => {
    settingsState.customshortcuts = settingsState.customshortcuts.filter((_, i) => i !== index);
  };

  const springTransition = { type: 'spring', damping: 20 };
</script>

{#snippet Shortcuts([index, Shortcut]: [string, { name: string, enabled: boolean }]) }
<div class="flex items-center justify-between px-4 py-3">
  <div class="pr-4">
    <h2 class="text-sm">{Shortcut.name}</h2>
  </div>
  <Switch state={Shortcut.enabled} onChange={() => switchChange(parseInt(index))} />
</div>
{/snippet}

<div class="flex flex-col pt-4 divide-y divide-zinc-100 dark:divide-zinc-700">
  <div>
    <MotionDiv
      initial={{ opacity: 0, height: 0 }}
      animate={isFormVisible ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={springTransition}
    >
      {#if isFormVisible}
        <div class="flex flex-col items-center">
          <MotionDiv
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            class="w-full"
          >
            <input
              class="w-full p-2 transition border-0 rounded-lg placeholder-zinc-300 bg-zinc-100 dark:bg-zinc-700 focus:bg-zinc-200/50 dark:focus:bg-zinc-600"
              type="text"
              placeholder="Shortcut Name"
              bind:value={newTitle}
            />
          </MotionDiv>
          <MotionDiv
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            class="w-full"
          >
            <input
              class="w-full p-2 my-2 transition border-0 rounded-lg placeholder-zinc-300 bg-zinc-100 dark:bg-zinc-700 focus:bg-zinc-200/50 dark:focus:bg-zinc-600"
              type="text"
              placeholder="URL eg. https://google.com"
              bind:value={newURL}
            />
          </MotionDiv>
        </div>
      {/if}
    </MotionDiv>

    <MotionDiv
      animate={isFormVisible ? { y: 0 } : { y: 0 }}
      transition={springTransition}
    >
      <button
        class="w-full px-4 py-2 mb-4 text-white transition rounded-xl bg-zinc-700/50"
        onclick={isFormVisible ? addNewCustomShortcut : toggleForm}
      >
        {isFormVisible ? 'Add' : 'Add Custom Shortcut'}
      </button>
    </MotionDiv>
  </div>

  {#each Object.entries($settingsState.shortcuts) as shortcut}
    {@render Shortcuts(shortcut)}
  {/each}

  <!-- Custom Shortcuts Section -->
  {#each $settingsState.customshortcuts as shortcut, index}
    <div class="flex items-center justify-between px-4 py-3">
      {shortcut.name}
      <button onclick={() => deleteCustomShortcut(index)}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/each}
</div>