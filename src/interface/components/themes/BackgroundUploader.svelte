<script lang="ts">
  let { onFileChange }: { onFileChange?: (file: File) => void } = $props();

  function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      onFileChange?.(file);
    }
    // Allow re-selecting the same file.
    input.value = "";
  }
</script>

<div class="relative w-16 h-16 overflow-hidden transition rounded-xl bg-zinc-100 dark:bg-zinc-900">
  <div
    class="flex items-center justify-center w-full h-full text-3xl font-bold text-gray-400 transition font-IconFamily hover:text-gray-500 pointer-events-none"
  >
    <!-- Plus icon -->
    
  </div>
  <input
    type="file"
    accept="image/*,video/*,.mp4,.mov,.webm,.m4v,.heic,.heif"
    onchange={handleFileChange}
    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
    aria-label="Upload background image or video"
  />
</div>
