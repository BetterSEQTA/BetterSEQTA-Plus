<script lang="ts">
  // Define the Background interface to specify the structure of background objects
  interface Background {
    id: string;         // Unique identifier for the background
    type: string;       // Type of the background ('image' or 'video')
    blob: Blob | null;  // Blob representing the background data (optional)
    url?: string | undefined;  // URL of the background if available (optional)
  }

  // Destructure and initialize props with types for the component
  let { bg, isSelected, isEditMode, onClick, onDelete } = $props<{ 
    bg: Background, 
    isSelected: boolean, 
    isEditMode: boolean, 
    onClick: () => void, 
    onDelete: () => void 
  }>();
</script>

<!-- Background container with click and keyboard event handling -->
<div
  onclick={onClick}  <!-- Trigger onClick when the div is clicked -->
  onkeydown={onClick}  <!-- Trigger onClick when the div is focused and a key is pressed -->
  tabindex="-1"  <!-- Make the div focusable -->
  role="button"  <!-- Specify that this element is interactive like a button -->
  class="relative w-16 h-16 cursor-pointer rounded-xl transition ring-3 dark:ring-zinc-500/50 ring-zinc-300 {isEditMode ? 'animate-shake' : ''} {isSelected ? 'dark:ring-4 ring-4' : 'ring-0'}"
>
  <!-- Conditionally render delete button if in edit mode -->
  {#if isEditMode}
    <div
      tabindex="-1"  <!-- Make the delete button focusable -->
      role="button"  <!-- Specify that this element is interactive like a button -->
      class="absolute top-0 right-0 z-10 flex w-6 h-6 p-2 text-white translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full place-items-center"
      onclick={onDelete}  <!-- Trigger onDelete when the delete button is clicked -->
      onkeydown={onDelete}  <!-- Trigger onDelete when a key is pressed while focused on the button -->
    >
      <!-- Horizontal line representing the delete icon (a simple 'X') -->
      <div class="w-4 h-0.5 bg-white"></div>
    </div>
  {/if}

  <!-- Conditionally render background content if a URL is provided -->
  {#if bg.url}
    <!-- Render image if the background type is 'image' -->
    {#if bg.type === 'image'}
      <img class="object-cover w-full h-full rounded-xl" src={bg.url} alt="swatch" />
    {:else if bg.type === 'video'}
      <!-- Render video if the background type is 'video' -->
      <video muted loop autoplay src={bg.url} class="object-cover w-full h-full rounded-xl"></video>
    {/if}
  {/if}
</div>
