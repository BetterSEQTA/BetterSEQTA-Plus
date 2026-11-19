<script lang="ts">
  import { blobToDataUrl } from "@/seqta/utils/base64";

  let {
    source,
    alt = "",
    class: className = "",
  }: {
    source: string | Blob | null | undefined;
    alt?: string;
    class?: string;
  } = $props();

  let src = $state("");

  $effect(() => {
    const value = source;
    if (!value) {
      src = "";
      return;
    }
    if (typeof value === "string") {
      src = value;
      return;
    }
    let cancelled = false;
    void blobToDataUrl(value).then((url) => {
      if (!cancelled) src = url;
    });
    return () => {
      cancelled = true;
    };
  });
</script>

{#if src}
  <img {src} {alt} class={className} />
{/if}
