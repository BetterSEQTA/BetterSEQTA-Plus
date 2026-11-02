<script lang="ts">
  import { createElement } from "react";
  import { createRoot, type Root } from "react-dom/client";
  import { onDestroy } from "svelte";

  let adapterProps = $props();
  let container = $state<HTMLDivElement | null>(null);
  let root: Root | null = null;

  $effect(() => {
    if (!container) return;

    const { el, children, class: className, ...rest } = adapterProps;
    try {
      root ??= createRoot(container);
      root.render(createElement(el, rest, children));
    } catch (err) {
      console.warn(`react-adapter failed to mount.`, { err });
    }
  });

  onDestroy(() => {
    try {
      root?.unmount();
    } catch (err) {
      console.warn(`react-adapter failed to unmount.`, { err });
    }
    root = null;
  });
</script>

<div bind:this={container} class={adapterProps.class}></div>
