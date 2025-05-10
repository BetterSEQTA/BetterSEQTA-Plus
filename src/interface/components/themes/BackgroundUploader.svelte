<script lang="ts">
  // Import the createEventDispatcher function from Svelte to dispatch custom events
  import { createEventDispatcher } from 'svelte';
  
  // Create an event dispatcher to send events to parent components
  const dispatch = createEventDispatcher();
  
  // Function to handle file input changes
  function handleFileChange(event: Event) {
    // Cast the event target to an HTMLInputElement
    const input = event.target as HTMLInputElement;
    
    // Get the first file from the input element (if any)
    const file = input.files?.[0];
    
    // If a file is selected, dispatch a custom 'fileChange' event with the file as payload
    if (file) {
      dispatch('fileChange', file);
    }
  }
</script>

<!-- Container for the file input with a styled plus icon -->
<div class="relative w-16 h-16 overflow-hidden transition rounded-xl bg-zinc-100 dark:bg-zinc-900">
  <div class="flex items-center justify-center w-full h-full text-3xl font-bold text-gray-400 transition font-IconFamily hover:text-gray-500">
    <!-- Plus icon displayed as text (icon code) -->
    
  </div>
  
  <!-- Invisible file input that triggers the handleFileChange function on change -->
  <input
    type="file"  <!-- Specifies that the input accepts files -->
    accept="image/*, video/mp4"  <!-- Restricts the file input to images and MP4 videos -->
    on:change={handleFileChange}  <!-- Binds the file change handler to the change event -->
    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"  <!-- Makes the input element invisible but clickable -->
  />
</div>
