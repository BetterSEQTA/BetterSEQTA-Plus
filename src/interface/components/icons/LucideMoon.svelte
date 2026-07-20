<script lang="ts">
  import { LUCIDE_MOON_PATH } from "@/lib/icons/lucideMoon";

  let { class: className = "w-5 h-5" }: { class?: string } = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="currentColor"
  class={className}
  aria-hidden="true"
>
  <path d={LUCIDE_MOON_PATH} />
</svg>
