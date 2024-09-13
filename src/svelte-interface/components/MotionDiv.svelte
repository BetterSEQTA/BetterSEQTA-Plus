<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { animate as motionAnimate, spring } from 'motion';

  let { initial, animate, exit, transition, children, class: className } = $props<{ 
    initial?: any, 
    animate?: any, 
    exit?: any, 
    transition?: any, 
    children?: any, 
    class?: string 
  }>();

  let divElement: HTMLElement;
  const dispatch = createEventDispatcher();

  const playAnimation = (keyframe: any) => {
    if (divElement && keyframe) {
      let animationOptions = transition;

      // If transition is not defined or is of type 'spring', use spring animations
      if (!transition || transition.type === 'spring') {
        animationOptions = {
          easing: spring(transition || { stiffness: 250, damping: 25 }),
        };
      }

      const animation = motionAnimate(divElement, keyframe, animationOptions);
      return animation.finished;
    }
    return Promise.resolve();
  };

  onMount(async () => {
    // Apply initial state if provided
    if (initial) {
      await playAnimation(initial);
    }
    // Then animate to the `animate` state
    if (animate) {
      await playAnimation(animate);
    }

    // Dispatch animation end event
    dispatch('animationend');
  });
  
  $effect(() => {
    if (animate) {
      playAnimation(animate);
    }

    dispatch('animationend');
  });

  // Handle unmounting with the `exit` animation
  onDestroy(async () => {
    if (exit) {
      await playAnimation(exit);
    }
  });
</script>

<div class={className} bind:this={divElement} style="will-change: transform, opacity;">
  {#if children}
    {@render children()}
  {/if}
</div>
