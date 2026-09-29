<script lang="ts">
  import type { Component } from "svelte";

  let {
    loader,
    props = {},
    remountKey = "default",
  }: {
    loader: () => Promise<{ default: Component }>;
    props?: Record<string, unknown>;
    /** Change to force a fresh import (e.g. different panel). Props-only updates reuse the component. */
    remountKey?: string;
  } = $props();

  let Comp = $state<Component | null>(null);
  let loadedKey = $state("");

  $effect(() => {
    const key = remountKey;
    if (key === loadedKey && Comp) return;

    loadedKey = key;
    Comp = null;
    void loader().then((mod) => {
      if (loadedKey === key) Comp = mod.default;
    });
  });
</script>

{#if Comp}
  <Comp {...props} />
{:else}
  <div class="px-2 py-8 text-sm text-zinc-400 animate-pulse">Loading…</div>
{/if}
