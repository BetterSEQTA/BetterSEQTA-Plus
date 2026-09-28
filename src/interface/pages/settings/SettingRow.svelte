<script lang="ts">
  import type { SettingsList } from "@/interface/types/SettingsProps";
  import { matchesSearch } from "./shared";

  let {
    title,
    description,
    Component,
    props = {},
    searchQuery = "",
  }: SettingsList & { searchQuery?: string } = $props();

  const visible = $derived(matchesSearch(searchQuery, title, description));
</script>

{#if visible}
  <div class="flex justify-between items-center px-5 py-5">
    <div class="pr-5">
      <h2 class="text-xl font-bold">{title}</h2>
      <p class="text-base text-zinc-600 dark:text-zinc-300">{description}</p>
    </div>
    <div class="shrink-0">
      <Component {...props} />
    </div>
  </div>
{/if}
