<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Background } from './types';

  export let filteredBackgrounds: Background[];

  let dispatch = createEventDispatcher();

  let filters = $state({
    type: [] as string[],
    color: [] as string[],
    resolution: [] as string[],
    orientation: [] as string[]
  });

  $: {
    dispatch('filter', filters);
  }

  function toggleFilter(category: keyof typeof filters, value: string) {
    if (filters[category].includes(value)) {
      filters[category] = filters[category].filter(v => v !== value);
    } else {
      filters[category] = [...filters[category], value];
    }
  }

  function clearFilters() {
    filters = {
      type: [],
      color: [],
      resolution: [],
      orientation: []
    };
  }
</script>

<div class="p-4 bg-white rounded-lg shadow dark:bg-gray-800">
  <h2 class="mb-4 text-xl font-semibold">Filters</h2>
  
  <div class="mb-4">
    <h3 class="mb-2 font-medium">Type</h3>
    <div class="space-y-2">
      <label class="flex items-center">
        <input type="checkbox" checked={filters.type.includes('image')} on:change={() => toggleFilter('type', 'image')}>
        <span class="ml-2">Image</span>
      </label>
      <label class="flex items-center">
        <input type="checkbox" checked={filters.type.includes('video')} on:change={() => toggleFilter('type', 'video')}>
        <span class="ml-2">Video</span>
      </label>
    </div>
  </div>
  
  <!-- Add similar sections for color, resolution, and orientation -->
  
  <button 
    class="px-4 py-2 mt-4 text-white bg-red-500 rounded hover:bg-red-600" 
    on:click={clearFilters}
  >
    Clear Filters
  </button>
</div>