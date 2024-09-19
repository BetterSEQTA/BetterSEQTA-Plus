<script lang="ts">
  import React from "react";
  import { createRoot } from "react-dom/client";
  import { onDestroy, onMount } from "svelte";

  const e = React.createElement;
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  onMount(() => {
    const { el, children, class: _, ...props } = $$props;
    try {
      root = createRoot(container);
      root.render(e(el, props, children));
    } catch (err) {
      console.warn(`react-adapter failed to mount.`, { err });
    }
  });

  onDestroy(() => {
    try {
      if (root) {
        root.unmount();
      }
    } catch (err) {
      console.warn(`react-adapter failed to unmount.`, { err });
    }
  });
</script>

<div bind:this={container} class={$$props.class}></div>