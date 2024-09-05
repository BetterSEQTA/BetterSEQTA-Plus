
<script lang="ts">
    import { settingsState } from "@/seqta/utils/listeners/SettingsState.ts"


    function formatUrl(inputUrl: string) {
        const protocolRegex = /^(http:\/\/|https:\/\/|ftp:\/\/)/;
        return protocolRegex.test(inputUrl) ? inputUrl : `https://${inputUrl}`;
    }

</script>

{#snippet Shortcuts([string, Shortcut]) }
<div class="flex items-center justify-between px-4 py-3">
  <div class="pr-4">
    <h2 class="text-sm font-bold">{Shortcut.name}</h2>
    <p class="text-xs">{Shortcut.enabled}</p>
  </div>
</div>
{/snippet}


<div class="text-xl">shortcuts tab</div>

<div class="flex flex-col -mt-4 overflow-y-scroll divide-y divide-zinc-100 dark:divide-zinc-700">
    {#each Object.entries(settingsState.shortcuts) as shortcut}
        {@render Shortcuts(shortcut)}
    {/each}
</div>