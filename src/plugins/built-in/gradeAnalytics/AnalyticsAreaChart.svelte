<script lang="ts">
  import * as Chart from "./chart/index";
  import { scaleLinear } from "d3-scale";
  import { Area, AreaChart, ChartClipPath, Spline } from "layerchart";
  import { curveMonotoneX } from "d3-shape";
  import { cubicInOut } from "svelte/easing";
  import type { Assessment } from "./types";
  import {
    buildGradeTrendChart,
    getTimeRangeLabel,
    type TimeRange,
  } from "./timeRange";
  import { computeGradeForecast, aggregateToMonthlyPoints } from "./utils/gradePrediction";
  import PredictionMonthsSlider from "./PredictionMonthsSlider.svelte";

  interface Props {
    data: Assessment[];
    timeRange: TimeRange;
    showSubjectTrends?: boolean;
  }

  let { data, timeRange, showSubjectTrends = false }: Props = $props();

  let showPrediction = $state(false);
  let predictionMonths = $state(3);

  const chartUid = `area-${Math.random().toString(36).slice(2, 9)}`;

  const chartResult = $derived.by(() =>
    buildGradeTrendChart(data, timeRange, {
      showPerSubject: showSubjectTrends,
    }),
  );

  const historicalData = $derived(chartResult.points);
  const chartSeries = $derived(chartResult.series);
  const accentColor = $derived(chartResult.accentColor);

  const forecast = $derived.by(() => {
    if (!showPrediction) return null;
    const points = aggregateToMonthlyPoints(
      historicalData
        .filter((p) => !Number.isNaN(p.average))
        .map((p) => ({ date: p.date, average: p.average })),
    );
    return computeGradeForecast(points, predictionMonths);
  });

  /** Bridge point + future months — separate series rendered via Spline. */
  const forecastLineData = $derived.by(() => {
    if (!showPrediction || !forecast) return [];

    const hist = historicalData.filter((p) => !Number.isNaN(p.average));
    if (!hist.length) return [];

    const last = hist[hist.length - 1];
    return [
      { date: last.date, forecast: last.average },
      ...forecast.points.map((p) => ({ date: p.date, forecast: p.value })),
    ];
  });

  const xDomain = $derived.by((): [Date, Date] | undefined => {
    const times = historicalData.map((p) => p.date.getTime());

    if (showPrediction && forecastLineData.length > 1) {
      for (const point of forecastLineData.slice(1)) {
        times.push(point.date.getTime());
      }
    }

    if (!times.length) return undefined;

    return [
      new Date(Math.min(...times)),
      new Date(Math.max(...times)),
    ];
  });

  const chartConfig = $derived.by(() => {
    const config: Chart.ChartConfig = {};
    for (const s of chartSeries) {
      config[s.key] = { label: s.label, color: s.color };
    }
    if (showPrediction && forecastLineData.length > 1) {
      config.forecast = {
        label: "Forecast",
        color: "var(--bsplus-analytics-forecast, var(--bsplus-analytics-accent))",
      };
    }
    return config;
  });

  const yScale = $derived.by(() => {
    if (!historicalData.length) return scaleLinear().domain([0, 100]);

    const values: number[] = [];
    for (const p of historicalData) {
      for (const s of chartSeries) {
        const v = p[s.key];
        if (typeof v === "number" && !Number.isNaN(v)) values.push(v);
      }
      if (typeof p.average === "number" && !Number.isNaN(p.average)) {
        values.push(p.average);
      }
    }

    for (const p of forecastLineData) {
      if (typeof p.forecast === "number" && !Number.isNaN(p.forecast)) {
        values.push(p.forecast);
      }
    }

    if (!values.length) return scaleLinear().domain([0, 100]);

    const min = Math.max(0, Math.min(...values) - 8);
    const max = Math.min(100, Math.max(...values) + 8);
    return scaleLinear().domain([min, max]).nice();
  });

  const trend = $derived.by(() => {
    if (historicalData.length < 2) {
      return { percentage: "0", direction: "neutral" as const };
    }

    const recent = historicalData.slice(-2);
    const change = recent[1].average - recent[0].average;

    return {
      percentage: Math.abs(change).toFixed(1),
      direction:
        change > 0 ? ("up" as const) : change < 0 ? ("down" as const) : ("neutral" as const),
    };
  });

  const areaSeries = $derived.by(() => {
    const series = chartSeries.map((s) => ({
      key: s.key,
      label: s.label,
      color: s.color,
    }));

    if (showPrediction && forecastLineData.length > 1) {
      series.push({
        key: "forecast",
        label: "Forecast",
        color: "var(--bsplus-analytics-forecast, var(--bsplus-analytics-accent))",
      });
    }

    return series;
  });

  const canForecast = $derived.by(() => {
    const monthly = aggregateToMonthlyPoints(
      historicalData
        .filter((p) => !Number.isNaN(p.average))
        .map((p) => ({ date: p.date, average: p.average })),
    );
    return monthly.length >= 3;
  });
</script>

<article class="bsplus-analytics-card">
  <header class="bsplus-analytics-card-header bsplus-analytics-card-header-split">
    <div class="bsplus-analytics-card-header-text">
      <div class="bsplus-analytics-card-title-row">
        <h3 class="bsplus-analytics-card-title">Grade trends</h3>
        <label class="bsplus-analytics-checkbox bsplus-analytics-forecast-toggle">
          <input
            type="checkbox"
            bind:checked={showPrediction}
            disabled={!canForecast}
          />
          <span class="bsplus-analytics-checkmark" aria-hidden="true"></span>
          <span>Forecast</span>
        </label>
      </div>
      <p class="bsplus-analytics-card-desc">
        {#if showSubjectTrends}
          Overall and per-subject averages · {getTimeRangeLabel(timeRange)}
        {:else}
          Average grades over time · {getTimeRangeLabel(timeRange)}
        {/if}
      </p>
    </div>

    {#if showPrediction}
      <div class="bsplus-analytics-card-controls">
        <label class="bsplus-analytics-card-control bsplus-analytics-forecast-horizon">
          <span class="bsplus-analytics-field-label">Months</span>
          <PredictionMonthsSlider bind:value={predictionMonths} />
        </label>
      </div>
    {/if}
  </header>

  <div class="bsplus-analytics-card-body">
    {#if historicalData.length > 0}
      {#key `${showPrediction}-${predictionMonths}`}
      <Chart.Container config={chartConfig} class="bsplus-chart-surface w-full">
        <AreaChart
          legend
          data={historicalData}
          x="date"
          {xDomain}
          yScale={yScale}
          series={areaSeries}
          props={{
            area: {
              curve: curveMonotoneX,
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
                <stop offset="0%" stop-color={accentColor} stop-opacity="0.55" />
                <stop offset="100%" stop-color={accentColor} stop-opacity="0.04" />
              </linearGradient>
            </defs>

            <ChartClipPath
              initialWidth={showPrediction ? undefined : 0}
              motion={showPrediction
                ? undefined
                : {
                    width: { type: "tween", duration: 900, easing: cubicInOut },
                  }}
            >
              {#each series as s, i (s.key)}
                {@const meta = chartSeries.find((c) => c.key === s.key)}
                {@const isOverall = meta?.isOverall ?? s.key === "average"}
                {@const isForecast = s.key === "forecast"}

                {#if !isForecast}
                  <Area
                    {...getAreaProps(s, i)}
                    fill={isOverall && !showSubjectTrends
                      ? `url(#${chartUid})`
                      : isOverall
                        ? accentColor
                        : "transparent"}
                    fill-opacity={isOverall ? (showSubjectTrends ? 0.08 : 0.35) : 0}
                    stroke={meta?.color ?? s.color}
                    style={`stroke: ${meta?.color ?? s.color}`}
                  />
                {/if}
              {/each}
            </ChartClipPath>
          {/snippet}

          {#snippet aboveMarks()}
            {#if showPrediction && forecastLineData.length > 1}
              <Spline
                data={forecastLineData}
                x="date"
                y="forecast"
                curve={curveMonotoneX}
                class="bsplus-analytics-forecast-line"
              />
            {/if}
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
      {/key}

      {#if showPrediction && !canForecast}
        <p class="bsplus-analytics-scale-hint">
          At least 3 graded periods are needed to generate a forecast.
        </p>
      {/if}
    {:else}
      <div class="bsplus-analytics-card-empty">
        <strong>No grade data for this range</strong>
        <span>Complete assessments with released marks to see trends.</span>
      </div>
    {/if}
  </div>

  <footer class="bsplus-analytics-card-footer">
    {#if showPrediction && forecast}
      <span>
        Projected average in {predictionMonths} month{predictionMonths === 1 ? "" : "s"}:
        <strong>{forecast.projectedGrade}%</strong>
        <span class="bsplus-analytics-footer-muted">
          · {forecast.trendPerMonth >= 0 ? "+" : ""}{forecast.trendPerMonth}%/mo trend
          · R² {forecast.rSquared.toFixed(2)}
        </span>
      </span>
      <br />
    {/if}

    {#if trend.direction === "up"}
      <span class="bsplus-analytics-trend-up"
        >Trending up · {trend.percentage}% vs previous period</span
      >
    {:else if trend.direction === "down"}
      <span class="bsplus-analytics-trend-down"
        >Trending down · {trend.percentage}% vs previous period</span
      >
    {:else}
      <span>Grades remain stable across this period</span>
    {/if}
    <br />
    <span>
      {historicalData.length} data points · {getTimeRangeLabel(timeRange)}
      {#if showSubjectTrends && chartSeries.length > 1}
        · {chartSeries.length - 1} subject{chartSeries.length - 1 === 1 ? "" : "s"}
      {/if}
      {#if showPrediction && forecast}
        · {forecast.methodLabel}
      {/if}
    </span>
  </footer>
</article>
