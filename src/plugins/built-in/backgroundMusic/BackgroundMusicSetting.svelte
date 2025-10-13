<script lang="ts">
  import localforage from 'localforage'
  import { onMount } from 'svelte'

  let fileInput = $state<HTMLInputElement | undefined>(undefined)
  let dragging = $state(false)
  let filename = $state<string | undefined>(undefined)
  let durationText = $state<string | undefined>(undefined)

  const store = localforage.createInstance({
    name: 'background-music-store',
    storeName: 'music',
  })

  async function loadExisting() {
    const name = await store.getItem<string>('audio-name')
    filename = name ?? undefined
  }

  onMount(() => { loadExisting() })

  function triggerSelect() { fileInput?.click() }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    // Accept WAV and MP3 files
    const isSupported = file.type === 'audio/wav' || file.type === 'audio/mpeg' || 
                       file.name.toLowerCase().endsWith('.wav') || file.name.toLowerCase().endsWith('.mp3')
    if (!isSupported) {
      alert('Please select a .wav or .mp3 audio file')
      return
    }

    await store.setItem('audio-blob', file)
    await store.setItem('audio-name', file.name)
    filename = file.name

    // Probe duration
    try {
      const url = URL.createObjectURL(file)
      const audio = new Audio(url)
      await new Promise<void>((resolve, reject) => {
        audio.onloadedmetadata = () => resolve()
        audio.onerror = () => reject()
      })
      if (!isNaN(audio.duration) && audio.duration !== Infinity) {
        const minutes = Math.floor(audio.duration / 60)
        const seconds = Math.round(audio.duration % 60)
        durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`
      } else {
        durationText = undefined
      }
      URL.revokeObjectURL(url)
    } catch {
      durationText = undefined
    }

    window.dispatchEvent(new Event('betterseqta-background-music-updated'))
  }

  function onFileChange() { handleFiles(fileInput?.files || null) }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    dragging = false
    handleFiles(event.dataTransfer?.files || null)
  }

  async function removeAudio() {
    await store.removeItem('audio-blob')
    await store.removeItem('audio-name')
    filename = undefined
    durationText = undefined
    window.dispatchEvent(new Event('betterseqta-background-music-stop'))
  }
</script>

<div
  class="relative cursor-pointer select-none"
  onclick={() => triggerSelect()}
  ondragover={(e) => { e.stopPropagation(); dragging = true }}
  ondragleave={() => dragging = false}
  ondrop={onDrop}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      triggerSelect()
    }
  }}
  role="button"
  tabindex="0"
>
  <div class="flex gap-3 items-center">
    {#if filename}
      <div class="flex items-center px-3 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800">
        <div class="text-xs text-zinc-600 dark:text-zinc-300">
          {filename}
          <p>{durationText}</p>
        </div>
        <button
          class="flex justify-center items-center m-1 text-lg dark:text-white size-7"
          onclick={(e) => { e.stopPropagation(); removeAudio() }}
          aria-label="Remove audio"
        >&#215;</button>
      </div>
    {:else}
      <div class="flex gap-2 items-center px-3 py-1 text-xs rounded-lg border border-dashed transition border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 text-nowrap">
        <span class="text-lg font-IconFamily">{'\ued47'}</span>
        <span>Upload audio</span>
      </div>
    {/if}
  </div>
  <input type="file" accept="audio/wav,audio/mpeg" class="hidden" bind:this={fileInput} onchange={onFileChange} />
  {#if dragging}
    <div class="absolute inset-0 rounded-lg bg-zinc-200/40 dark:bg-zinc-700/40"></div>
  {/if}
</div>


