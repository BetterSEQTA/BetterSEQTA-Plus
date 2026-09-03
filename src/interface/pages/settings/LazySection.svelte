<script lang="ts">
  import type { Component } from "svelte";
  import type { SettingsSectionId, SettingsSectionSharedProps } from "./shared";
  import { SECTION_LOADERS } from "./sectionLoaders";

  let {
    section,
    ...rest
  }: SettingsSectionSharedProps & { section: SettingsSectionId } = $props();

  let Comp = $state<Component | null>(null);
  let loadToken = 0;

  $effect(() => {
    section;
    Comp = null;
    const token = ++loadToken;
    void SECTION_LOADERS[section]().then((mod) => {
      if (token === loadToken) Comp = mod.default;
    });
  });
</script>

{#if Comp}
  <Comp {section} {...rest} />
{:else}
  <div class="px-5 py-6 text-sm text-zinc-400 animate-pulse">Loading…</div>
{/if}
