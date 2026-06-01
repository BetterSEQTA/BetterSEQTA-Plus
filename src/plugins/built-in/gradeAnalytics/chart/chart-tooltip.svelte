<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import type { Snippet } from "svelte";
  import { getTooltipContext, Tooltip as TooltipPrimitive } from "layerchart";
  import { cn } from "../utils/cn";
  import {
    getPayloadConfigFromPayload,
    useChart,
    type TooltipPayload,
  } from "./chart-utils";

  function defaultFormatter(value: unknown) {
    return `${value}`;
  }

  let {
    class: className,
    hideLabel = false,
    indicator = "dot",
    hideIndicator = false,
    labelKey,
    label,
    labelFormatter = defaultFormatter,
    labelClassName,
    formatter,
    nameKey,
    color,
    ...restProps
  }: HTMLAttributes<HTMLDivElement> & {
    hideLabel?: boolean;
    label?: string;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
    hideIndicator?: boolean;
    labelClassName?: string;
    labelFormatter?: (
      value: unknown,
      payload: TooltipPayload[],
    ) => string | number | Snippet;
    formatter?: Snippet<
      [
        {
          value: unknown;
          name: string;
          item: TooltipPayload;
          index: number;
          payload: TooltipPayload[];
        },
      ]
    >;
  } = $props();

  const chart = useChart();
  const tooltipCtx = getTooltipContext();

  const formattedLabel = $derived.by(() => {
    if (hideLabel || !tooltipCtx.payload?.length) return null;

    const [item] = tooltipCtx.payload;
    const key = labelKey ?? item?.label ?? item?.name ?? "value";
    const itemConfig = getPayloadConfigFromPayload(chart.config, item, key);
    const value =
      !labelKey && typeof label === "string"
        ? (chart.config[label as keyof typeof chart.config]?.label ?? label)
        : (itemConfig?.label ?? item.label);

    if (value === undefined) return null;
    if (!labelFormatter) return value;
    return labelFormatter(value, tooltipCtx.payload);
  });

  const nestLabel = $derived(
    tooltipCtx.payload.length === 1 && indicator !== "dot",
  );
</script>

{#snippet TooltipLabel()}
  {#if formattedLabel}
    <div class={cn("font-medium text-zinc-900 dark:text-white", labelClassName)}>
      {#if typeof formattedLabel === "function"}
        {@render formattedLabel()}
      {:else}
        {formattedLabel}
      {/if}
    </div>
  {/if}
{/snippet}

<TooltipPrimitive.Root variant="none">
  <div
    class={cn(
      "grid min-w-[9rem] items-start gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs shadow-xl text-zinc-900 dark:text-white",
      className,
    )}
    {...restProps}
  >
    {#if !nestLabel}
      {@render TooltipLabel()}
    {/if}
    <div class="grid gap-1.5">
      {#each tooltipCtx.payload as item, i (item.key + i)}
        {@const key = `${nameKey || item.key || item.name || "value"}`}
        {@const itemConfig = getPayloadConfigFromPayload(chart.config, item, key)}
        {@const indicatorColor = color || item.payload?.color || item.color}
        <div
          class={cn(
            "flex w-full flex-wrap items-stretch gap-2",
            indicator === "dot" && "items-center",
          )}
        >
          {#if formatter && item.value !== undefined && item.name}
            {@render formatter({
              value: item.value,
              name: item.name,
              item,
              index: i,
              payload: tooltipCtx.payload,
            })}
          {:else}
            {#if !hideIndicator}
              <div
                style="background: {indicatorColor}; border-color: {indicatorColor};"
                class={cn("shrink-0 rounded-[2px] border", {
                  "size-2.5": indicator === "dot",
                  "h-full w-1": indicator === "line",
                  "w-0 border-[1.5px] border-dashed bg-transparent":
                    indicator === "dashed",
                })}
              ></div>
            {/if}
            <div
              class={cn(
                "flex flex-1 shrink-0 justify-between leading-none",
                nestLabel ? "items-end" : "items-center",
              )}
            >
              <div class="grid gap-1.5">
                {#if nestLabel}
                  {@render TooltipLabel()}
                {/if}
                <span class="text-zinc-500 dark:text-zinc-400">
                  {itemConfig?.label || item.name}
                </span>
              </div>
              {#if item.value !== undefined}
                <span class="font-mono font-medium tabular-nums">
                  {item.value.toLocaleString()}
                </span>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</TooltipPrimitive.Root>
