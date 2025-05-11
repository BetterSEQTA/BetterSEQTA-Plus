<script lang="ts">
  // Importing the createEventDispatcher function from Svelte for custom event dispatching
  import { createEventDispatcher } from 'svelte';
  let dispatch = createEventDispatcher(); // Initialize the event dispatcher to communicate with parent components

  // Define the state for filters with default values
  let filters = $state({
    type: [] as string[], // List of selected types
    color: [] as string[], // List of selected colors
    resolution: [] as string[], // List of selected resolutions
    orientation: [] as string[] // List of selected orientations
  });

  // Effect to dispatch 'filter' event whenever filters are updated
  $effect(() => {
    dispatch('filter', filters); // Dispatch the filters state to the parent component
  });

  // Function to toggle a filter value in the specified category
  function toggleFilter(category: keyof typeof filters, value: string) {
    // Check if the value is already in the selected filters, and either add or remove it
    if (filters[category].includes(value)) {
      filters[category] = filters[category].filter(v => v !== value); // Remove the value
    } else {
      filters[category] = [...filters[category], value]; // Add the value
    }
  }

  // Function to clear all selected filters
  function clearFilters() {
    // Reset all filter categories to empty arrays
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
      <!-- Checkbox for "Image" type filter -->
      <label class="flex items-center">
        <input type="checkbox" checked={filters.type.includes('image')} onchange={() => toggleFilter('type', 'image')}>
        <span class="ml-2">Image</span>
      </label>
      <!-- Checkbox for "Video" type filter -->
      <label class="flex items-center">
        <input type="checkbox" checked={filters.type.includes('video')} onchange={() => toggleFilter('type', 'video')}>
        <span class="ml-2">Video</span>
      </label>
    </div>
  </div>
    
  <!-- Button to clear all filters -->
  <button 
    class="px-4 py-2 mt-4 text-white bg-red-500 rounded hover:bg-red-600" 
    onclick={clearFilters}
  >
    Clear Filters
  </button>
</div>
