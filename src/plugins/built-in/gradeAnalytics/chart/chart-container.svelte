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

  function observeChartResize(node: HTMLElement) {
    let frame = 0;
    const notify = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });
    };

    const observer = new ResizeObserver(notify);
    observer.observe(node);
    notify();

    return {
      destroy() {
        cancelAnimationFrame(frame);
        observer.disconnect();
      },
    };
  }
</script>

<div
  bind:this={ref}
  use:observeChartResize
  data-chart={chartId}
  data-slot="chart"
  class="bsplus-chart-host {className}"
  {...restProps}
>
  <ChartStyle id={chartId} {config} />
  {@render children?.()}
</div>
