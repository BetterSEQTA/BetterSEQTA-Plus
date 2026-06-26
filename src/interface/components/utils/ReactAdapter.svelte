<script lang="ts">
  import React from "react";
  import ReactDOM from "react-dom";
  import { onDestroy } from "svelte";

  const e = React.createElement;
  let adapterProps = $props();
  let container = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (!container) return;

    const { el, children, class: className, ...rest } = adapterProps;
    try {
      ReactDOM.render(e(el, rest, children), container);
    } catch (err) {
      console.warn(`react-adapter failed to mount.`, { err });
    }
  });

  onDestroy(() => {
    if (!container) return;
    try {
      ReactDOM.unmountComponentAtNode(container);
    } catch (err) {
      console.warn(`react-adapter failed to unmount.`, { err });
    }
  });
</script>

<div bind:this={container} class={adapterProps.class}></div>
