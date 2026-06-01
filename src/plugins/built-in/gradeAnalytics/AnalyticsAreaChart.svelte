<script lang="ts">

  import * as Chart from "./chart/index";

  import { scaleUtc, scaleLinear } from "d3-scale";

  import { Area, AreaChart, ChartClipPath } from "layerchart";

  import { curveNatural } from "d3-shape";

  import { cubicInOut } from "svelte/easing";

  import type { Assessment } from "./types";

  import {

    buildGradeTrendChart,

    getTimeRangeLabel,

    type TimeRange,

  } from "./timeRange";



  interface Props {

    data: Assessment[];

    timeRange: TimeRange;

    showSubjectTrends?: boolean;

  }



  let { data, timeRange, showSubjectTrends = false }: Props = $props();



  const chartUid = `area-${Math.random().toString(36).slice(2, 9)}`;



  const chartResult = $derived(() =>

    buildGradeTrendChart(data, timeRange, {

      showPerSubject: showSubjectTrends,

    }),

  );



  const filteredData = $derived(() => chartResult().points);

  const chartSeries = $derived(() => chartResult().series);

  const accentColor = $derived(() => chartResult().accentColor);



  const chartConfig = $derived(() => {

    const config: Chart.ChartConfig = {};

    for (const s of chartSeries()) {

      config[s.key] = { label: s.label, color: s.color };

    }

    return config;

  });



  const yScale = $derived.by(() => {

    const points = filteredData();

    const series = chartSeries();

    if (!points.length) return scaleLinear().domain([0, 100]);

    const values: number[] = [];

    for (const p of points) {

      for (const s of series) {

        const v = p[s.key];

        if (typeof v === "number" && !Number.isNaN(v)) values.push(v);

      }

    }

    if (!values.length) return scaleLinear().domain([0, 100]);

    const min = Math.max(0, Math.min(...values) - 8);

    const max = Math.min(100, Math.max(...values) + 8);

    return scaleLinear().domain([min, max]).nice();

  });



  const trend = $derived(() => {

    const points = filteredData();

    if (points.length < 2) return { percentage: "0", direction: "neutral" as const };

    const recent = points.slice(-2);

    const change = recent[1].average - recent[0].average;

    return {

      percentage: Math.abs(change).toFixed(1),

      direction: change > 0 ? ("up" as const) : change < 0 ? ("down" as const) : ("neutral" as const),

    };

  });



  const areaSeries = $derived(() =>

    chartSeries().map((s) => ({

      key: s.key,

      label: s.label,

      color: s.color,

    })),

  );

</script>



<article class="bsplus-analytics-card">

  <header class="bsplus-analytics-card-header">

    <div>

      <h3 class="bsplus-analytics-card-title">Grade trends</h3>

      <p class="bsplus-analytics-card-desc">

        {#if showSubjectTrends}

          Overall and per-subject averages · {getTimeRangeLabel(timeRange)}

        {:else}

          Average grades over time · {getTimeRangeLabel(timeRange)}

        {/if}

      </p>

    </div>

  </header>



  <div class="bsplus-analytics-card-body">

    {#if filteredData().length > 0}

      <Chart.Container config={chartConfig()} class="bsplus-chart-surface w-full">

        <AreaChart

          legend

          data={filteredData()}

          x="date"

          xScale={scaleUtc()}

          yScale={yScale()}

          series={areaSeries()}

          props={{

            area: {

              curve: curveNatural,

              "fill-opacity": showSubjectTrends ? 0.12 : 0.35,

              line: { class: "stroke-2" },

              motion: "tween",

            },

            xAxis: {

              ticks: timeRange === "7d" ? 7 : undefined,

              format: (v: Date) =>

                v.toLocaleDateString("en-US", {

                  month: "short",

                  day: timeRange === "7d" ? "numeric" : undefined,

                }),

            },

            yAxis: {

              format: (v: number) => `${v.toFixed(0)}%`,

            },

          }}

        >

          {#snippet marks({ series, getAreaProps })}

            <defs>

              <linearGradient id={chartUid} x1="0" y1="0" x2="0" y2="1">

                <stop offset="0%" stop-color={accentColor()} stop-opacity="0.55" />

                <stop offset="100%" stop-color={accentColor()} stop-opacity="0.04" />

              </linearGradient>

            </defs>

            <ChartClipPath

              initialWidth={0}

              motion={{

                width: { type: "tween", duration: 900, easing: cubicInOut },

              }}

            >

              {#each series as s, i (s.key)}

                {@const meta = chartSeries().find((c) => c.key === s.key)}

                {@const isOverall = meta?.isOverall ?? s.key === "average"}

                <Area

                  {...getAreaProps(s, i)}

                  fill={isOverall && !showSubjectTrends

                    ? `url(#${chartUid})`

                    : isOverall

                      ? accentColor()

                      : "transparent"}

                  fill-opacity={isOverall ? (showSubjectTrends ? 0.08 : 0.35) : 0}

                  stroke={meta?.color ?? s.color}

                  style={`stroke: ${meta?.color ?? s.color}`}

                />

              {/each}

            </ChartClipPath>

          {/snippet}

          {#snippet tooltip()}

            <Chart.Tooltip

              labelFormatter={(v: Date) =>

                v.toLocaleDateString("en-US", {

                  month: "long",

                  day: "numeric",

                  year: "numeric",

                })}

              indicator="line"

            />

          {/snippet}

        </AreaChart>

      </Chart.Container>

    {:else}

      <div class="bsplus-analytics-card-empty">

        <strong>No grade data for this range</strong>

        <span>Complete assessments with released marks to see trends.</span>

      </div>

    {/if}

  </div>



  <footer class="bsplus-analytics-card-footer">

    {#if trend().direction === "up"}

      <span class="bsplus-analytics-trend-up"

        >Trending up · {trend().percentage}% vs previous period</span

      >

    {:else if trend().direction === "down"}

      <span class="bsplus-analytics-trend-down"

        >Trending down · {trend().percentage}% vs previous period</span

      >

    {:else}

      <span>Grades remain stable across this period</span>

    {/if}

    <br />

    <span>

      {filteredData().length} data points · {getTimeRangeLabel(timeRange)}

      {#if showSubjectTrends && chartSeries().length > 1}

        · {chartSeries().length - 1} subject{chartSeries().length - 1 === 1 ? "" : "s"}

      {/if}

    </span>

  </footer>

</article>

