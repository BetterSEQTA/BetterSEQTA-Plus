<script lang="ts">
  import { onMount, onDestroy } from 'svelte'; // Import lifecycle hooks from Svelte
  import { animate as motionAnimate } from 'motion'; // Import animate function from motion library

  // Destructure props with optional animation configurations and class name
  let { initial, animate, exit, transition, children, class: className } = $props<{ 
    initial?: any, 
    animate?: any, 
    exit?: any, 
    transition?: any, 
    children?: any, 
    class?: string 
  }>();

  let divElement: HTMLElement; // Reference to the DOM element to animate

  // Function to trigger animation with support for 'auto' height calculation
  const playAnimation = (keyframe: any) => {
    if (divElement && keyframe) {
      let finalKeyframe = { ...keyframe };

      // If height is set to 'auto', compute actual height to animate smoothly
      if (finalKeyframe.height === 'auto') {
        const prevHeight = divElement.style.height;
        const prevVisibility = divElement.style.visibility;
        
        divElement.style.height = 'auto';
        divElement.style.visibility = 'hidden';
        divElement.style.position = 'absolute';
        
        const autoHeight = divElement.offsetHeight; // Measure computed auto height
        
        divElement.style.height = prevHeight;
        divElement.style.visibility = prevVisibility;
        divElement.style.position = '';
        
        finalKeyframe.height = `${autoHeight}px`; // Set measured height in keyframe
      }

      const defaultSpringConfig = { stiffness: 250, damping: 25 }; // Default spring animation config

      // Start animation using motion library with spring physics
      const animation = motionAnimate(
        [divElement],
        finalKeyframe,
        {
          type: 'spring',
          stiffness: transition?.stiffness || defaultSpringConfig.stiffness,
          damping: transition?.damping || defaultSpringConfig.damping
        }
      );
      return animation;
    }
    return Promise.resolve(); // Return resolved promise if no animation is needed
  };

  // Run on component mount
  onMount(async () => {
    if (initial) {
      Object.assign(divElement.style, initial); // Apply initial styles directly
      await playAnimation(animate || {}); // Play entrance animation if provided
    } else if (animate) {
      await playAnimation(animate); // Play animation if only animate is specified
    }
  });
  
  // Reactively re-animate when `animate` changes
  $effect(() => {
    if (animate) {
      playAnimation(animate);
    }
  });

  // Run on component destroy
  onDestroy(async () => {
    if (exit) {
      await playAnimation(exit); // Play exit animation if provided
    }
  });
</script>

<!-- Container for the animated content -->
<div class={className} bind:this={divElement} style="will-change: transform, opacity;">
  {#if children}
    {@render children()} <!-- Render child content if present -->
  {/if}
</div>
