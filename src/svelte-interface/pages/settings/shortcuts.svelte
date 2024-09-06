
<script lang="ts">
    import { settingsState } from "@/seqta/utils/listeners/SettingsState.ts"
    import Switch from "../../components/Switch.svelte"
    console.log(settingsState.shortcuts)


</script>

{#snippet Shortcuts({ name, enabled, Component, props }) }
<div class="flex items-center justify-between px-4 py-3">
  <div class="pr-4">
    <h2 class="text-sm font-bold">{name}</h2>
    <p class="text-xs">{enabled}</p>
  </div>
  <div>
    <Component {...props} />
  </div>
</div>
{/snippet}

<div class="flex flex-col -mt-4 overflow-y-scroll divide-y divide-zinc-100 dark:divide-zinc-700">
    {#each settingsState.shortcuts as shortcut}
    {@const shortcutFinal = {
      ...shortcut,
      name: shortcut.name,
      enabled: shortcut.enabled,
      Component: Switch,
      props: {
        // placeholder
        // state: $settingsState.onoff,
        // onChange: (isOn: boolean) => settingsState.onoff = isOn
      }
    }}
      {@render Shortcuts(shortcutFinal)}
    {/each}
</div>