<script lang="ts">
  // Import necessary modules for React and ReactDOM, and Svelte lifecycle functions
  import React from "react";
  import ReactDOM from "react-dom";
  import { onDestroy, onMount } from "svelte";

  // Create a shorthand for React.createElement
  const e = React.createElement;
  
  // Declare a container for the React component
  let container: HTMLDivElement;

  // onMount lifecycle function in Svelte to run when the component is mounted
  onMount(() => {
    // Destructure $$props to extract the element, children, and class
    const { el, children, class: _, ...props } = $$props;
    try {
      // Render the React element into the container using ReactDOM
      ReactDOM.render(e(el, props, children), container);
    } catch (err) {
      // Catch and log any errors that occur during mounting
      console.warn(`react-adapter failed to mount.`, { err });
    }
  });

  // onDestroy lifecycle function in Svelte to run when the component is destroyed
  onDestroy(() => {
    try {
      // Unmount the React component from the container using ReactDOM
      ReactDOM.unmountComponentAtNode(container);
    } catch (err) {
      // Catch and log any errors that occur during unmounting
      console.warn(`react-adapter failed to unmount.`, { err });
    }
  });
</script>

<!-- HTML container bound to the container variable, with a class from $$props -->
<div bind:this={container} class={$$props.class}></div>
