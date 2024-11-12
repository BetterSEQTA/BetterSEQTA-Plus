<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      dispatch('fileChange', file);
    }
  }
</script>

<div class="relative w-16 h-16 overflow-hidden transition rounded-xl bg-zinc-100 dark:bg-zinc-900">
  <div class="flex items-center justify-center w-full h-full text-3xl font-bold text-gray-400 transition font-IconFamily hover:text-gray-500">
    <!--  Plus icon -->
    
  </div>
  <input
    type="file"
    accept="image/*, video/mp4"
    on:change={handleFileChange}
    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
  />
</div>