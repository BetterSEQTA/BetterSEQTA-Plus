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
      let finalKeyframe = { ...keyframe };

      if (finalKeyframe.height === 'auto') {
        divElement.style.visibility = 'hidden';
        divElement.style.height = 'auto';
        const height = divElement.offsetHeight;
        divElement.style.height = divElement.style.height || '0px';
        divElement.style.visibility = '';
        
        finalKeyframe.height = `${height}px`;
      }

      if (!transition || transition.type === 'spring') {
        animationOptions = {
          easing: spring(transition || { stiffness: 250, damping: 25 }),
        };
      }

      const animation = motionAnimate(divElement, finalKeyframe, animationOptions);
      return animation.finished;
    }
    return Promise.resolve();
  };

  onMount(async () => {
    if (initial) {
      Object.assign(divElement.style, initial);
      await playAnimation(animate || {});
    } else if (animate) {
      await playAnimation(animate);
    }

    dispatch('animationend');
  });
  
  $effect(() => {
    if (animate) {
      playAnimation(animate);
    }

    dispatch('animationend');
  });

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
