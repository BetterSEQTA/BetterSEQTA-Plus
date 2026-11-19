<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { getChartContext, Tooltip as TooltipPrimitive } from "layerchart";
  import { useChart } from "./chart-utils";

  let {
    class: className,
    hideLabel = false,
    indicator = "dot",
    labelFormatter = (value: unknown) => `${value}`,
    ...restProps
  }: HTMLAttributes<HTMLDivElement> & {
    hideLabel?: boolean;
    indicator?: "line" | "dot" | "dashed";
    labelFormatter?: (value: any) => string;
  } = $props();

  const chart = useChart();
  const ctx = getChartContext();

  const items = $derived(ctx.tooltip.series.filter((s) => s.visible));

  const label = $derived.by(() => {
    if (hideLabel || ctx.tooltip.data == null) return null;
    return labelFormatter(ctx.x(ctx.tooltip.data));
  });

  const nestLabel = $derived(items.length === 1 && indicator !== "dot");
</script>

{#snippet TooltipLabel()}
  {#if label}
    <div class="font-medium text-zinc-900 dark:text-white">{label}</div>
  {/if}
{/snippet}

<TooltipPrimitive.Root variant="none" portal={false}>
  <div
    class={[
      "grid min-w-36 items-start gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs shadow-xl text-zinc-900 dark:text-white",
      className,
    ]}
    {...restProps}
  >
    {#if !nestLabel}
      {@render TooltipLabel()}
    {/if}
    <div class="grid gap-1.5">
      {#each items as item (item.key)}
        {@const indicatorColor = item.color}
        <div
          class={[
            "flex w-full flex-wrap items-stretch gap-2",
            indicator === "dot" && "items-center",
          ]}
        >
          <div
            style="background: {indicatorColor}; border-color: {indicatorColor};"
            class={[
              "shrink-0 rounded-[2px] border",
              {
                "size-2.5": indicator === "dot",
                "h-full w-1": indicator === "line",
                "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
              },
            ]}
          ></div>
          <div
            class={[
              "flex flex-1 shrink-0 justify-between leading-none",
              nestLabel ? "items-end" : "items-center",
            ]}
          >
            <div class="grid gap-1.5">
              {#if nestLabel}
                {@render TooltipLabel()}
              {/if}
              <span class="text-zinc-500 dark:text-zinc-400">
                {chart.config[item.key]?.label ?? item.label}
              </span>
            </div>
            {#if item.value != null && !Number.isNaN(Number(item.value))}
              <span class="font-mono font-medium tabular-nums">
                {item.value.toLocaleString()}
              </span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</TooltipPrimitive.Root>
