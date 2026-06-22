<script lang="ts">
  import { blobToDataUrl } from '@/plugins/built-in/themes/themeImageUrl'

  let {
    source,
    alt = '',
    class: className = '',
  } = $props<{
    source: string | Blob | null | undefined
    alt?: string
    class?: string
  }>()

  let src = $state('')

  $effect(() => {
    const value = source
    if (!value) {
      src = ''
      return
    }
    if (typeof value === 'string') {
      src = value
      return
    }
    let cancelled = false
    blobToDataUrl(value).then((url) => {
      if (!cancelled) src = url
    })
    return () => {
      cancelled = true
    }
  })
</script>

{#if src}
  <img src={src} alt={alt} class={className} />
{/if}
