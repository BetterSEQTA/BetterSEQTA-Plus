<script lang="ts">
  interface Background {
    id: string;
    type: string;
    blob: Blob | null;
    url?: string | undefined;
  }

  let { bg, isSelected, isEditMode, onClick, onDelete } = $props<{ bg: Background, isSelected: boolean, isEditMode: boolean, onClick: () => void, onDelete: () => void }>();

</script>

<div
  onclick={onClick}
  onkeydown={onClick}
  tabindex="-1"
  role="button"
  class="relative w-16 h-16 cursor-pointer rounded-xl transition ring dark:ring-zinc-500/50 ring-zinc-300 {isEditMode ? 'animate-shake' : ''} {isSelected ? 'dark:ring-4 ring-4' : 'ring-0'}"
>
  {#if isEditMode}
    <div
      tabindex="-1"
      role="button"
      class="absolute top-0 right-0 z-10 flex w-6 h-6 p-2 text-white translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full place-items-center"
      onclick={onDelete}
      onkeydown={onDelete}
    >
      <div class="w-4 h-0.5 bg-white"></div>
    </div>
  {/if}
  {#if bg.url}
    {#if bg.type === 'image'}
      <img class="object-cover w-full h-full rounded-xl" src={bg.url} alt="swatch" />
    {:else if bg.type === 'video'}
      <video muted loop autoplay src={bg.url} class="object-cover w-full h-full rounded-xl"></video>
    {/if}
  {/if}
</div>