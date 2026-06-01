<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import ChartStyle from "./chart-style.svelte";
  import { setChartContext, type ChartConfig } from "./chart-utils";

  const uid = $props.id();

  let {
    ref = $bindable(null),
    id = uid,
    class: className = "",
    children,
    config,
    ...restProps
  }: HTMLAttributes<HTMLElement> & {
    ref?: HTMLElement | null;
    config: ChartConfig;
    class?: string;
  } = $props();

  const chartId = $derived(`chart-${id || uid.replace(/:/g, "")}`);

  setChartContext({
    get config() {
      return config;
    },
  });
</script>

<div
  bind:this={ref}
  data-chart={chartId}
  data-slot="chart"
  class="bsplus-chart-host {className}"
  {...restProps}
>
  <ChartStyle id={chartId} {config} />
  {@render children?.()}
</div>
