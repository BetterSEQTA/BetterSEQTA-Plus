<script lang="ts">
  import { OVERVIEW_ICON_PATHS, type OverviewIconName } from "./icons";

  interface Props {
    name: OverviewIconName;
    class?: string;
    size?: number;
  }

  let { name, class: className = "", size = 20 }: Props = $props();

  const paths = $derived.by(() => {
    const raw = OVERVIEW_ICON_PATHS[name];
    return Array.isArray(raw) ? raw : [raw];
  });
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  viewBox="0 0 24 24"
  stroke-width="1.5"
  stroke="currentColor"
  width={size}
  height={size}
  class="bsplus-overview-icon {className}"
  aria-hidden="true"
>
  {#each paths as path, index (index)}
    <path stroke-linecap="round" stroke-linejoin="round" d={path} />
  {/each}
</svg>
