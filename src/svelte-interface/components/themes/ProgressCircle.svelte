<script lang="ts">
  let { progress } = $props<{ progress: number }>();
  
  let circumference = $derived(2 * Math.PI * 14);
  let offset = $derived(circumference * (1 - (progress / 100)));
</script>

<div class="absolute top-0 left-0 z-20 flex items-center justify-center w-full h-full">
  <svg class="w-full h-full text-zinc-100 dark:text-zinc-700" viewBox="0 0 36 36">
    <circle stroke="currentColor" fill="none" stroke-width="4" stroke-linecap="round" cx="18" cy="18" r="10" stroke-dasharray="{circumference} {circumference}" stroke-dashoffset="0" transform="rotate(-90 18 18)"></circle>
    <circle stroke="#3B82F6" fill="none" stroke-width="4" stroke-linecap="round" cx="18" cy="18" r="10" stroke-dasharray="{circumference} {circumference}" stroke-dashoffset="{offset}" transform="rotate(-90 18 18)"></circle>
  </svg>
</div>