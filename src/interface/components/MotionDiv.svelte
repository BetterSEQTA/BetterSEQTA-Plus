<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { animate as motionAnimate } from 'motion';

  let { initial, animate, exit, transition, children, class: className } = $props<{ 
    initial?: any, 
    animate?: any, 
    exit?: any, 
    transition?: any, 
    children?: any, 
    class?: string 
  }>();

  let divElement: HTMLElement;

  const playAnimation = (keyframe: any) => {
    if (divElement && keyframe) {
      let finalKeyframe = { ...keyframe };

      if (finalKeyframe.height === 'auto') {
        const prevHeight = divElement.style.height;
        const prevVisibility = divElement.style.visibility;
        
        divElement.style.height = 'auto';
        divElement.style.visibility = 'hidden';
        divElement.style.position = 'absolute';
        
        const autoHeight = divElement.offsetHeight;
        
        divElement.style.height = prevHeight;
        divElement.style.visibility = prevVisibility;
        divElement.style.position = '';
        
        finalKeyframe.height = `${autoHeight}px`;
      }

      const defaultSpringConfig = { stiffness: 250, damping: 25 };

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
    return Promise.resolve();
  };

  onMount(async () => {
    if (initial) {
      Object.assign(divElement.style, initial);
      await playAnimation(animate || {});
    } else if (animate) {
      await playAnimation(animate);
    }
  });
  
  $effect(() => {
    if (animate) {
      playAnimation(animate);
    }
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
