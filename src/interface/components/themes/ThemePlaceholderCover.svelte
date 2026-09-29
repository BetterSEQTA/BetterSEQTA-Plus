<script lang="ts">
  import { defaultThemeCoverDataUrl } from "@/interface/utils/themePlaceholderCover";

  let {
    accentHint = "#52525b",
    class: className = "",
  }: {
    accentHint?: string;
    class?: string;
  } = $props();

  const src = $derived(defaultThemeCoverDataUrl(accentHint));
</script>

<img src={src} alt="" class={className} draggable="false" />
