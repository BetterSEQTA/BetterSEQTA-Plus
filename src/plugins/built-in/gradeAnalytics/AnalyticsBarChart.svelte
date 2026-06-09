<script lang="ts">

  import { onMount } from "svelte";

  import { scaleBand, scaleLinear } from "d3-scale";

  import { BarChart } from "layerchart";

  import * as Chart from "./chart/index";

  import { cubicInOut } from "svelte/easing";

  import { getUserInfo } from "@/seqta/ui/AddBetterSEQTAElements";

  import type { Assessment } from "./types";

  import { getTimeRangeLabel, type TimeRange } from "./timeRange";

  import {

    buildGradeDistribution,

    DISTRIBUTION_MODE_OPTIONS,

    type DistributionMode,

  } from "./gradeDistribution";

  import { loadDistributionMode, saveDistributionMode } from "./storage";



  interface Props {

    data: Assessment[];

    timeRange: TimeRange;

  }



  let { data, timeRange }: Props = $props();



  let distributionMode: DistributionMode = $state("auto");

  let modeReady = $state(false);

  let studentId: number | null = $state(null);



  const accentColor =

    "var(--bsplus-analytics-accent, var(--better-main, #007bff))";



  const distribution = $derived(() =>

    buildGradeDistribution(data, distributionMode),

  );



  const chartData = $derived(() =>

    distribution().buckets.map((b) => ({

      grade: b.label,

      count: b.count,

      minPercent: b.minPercent,

      maxPercent: b.maxPercent,

    })),

  );

  const useLetterScaleLabels = $derived(() => distribution().modeUsed === "letter");

  function formatXTick(label: string): string {

    if (!useLetterScaleLabels()) return label;

    const row = chartData().find((d) => d.grade === label);

    if (

      row?.minPercent !== undefined &&

      row?.maxPercent !== undefined &&

      !(row.minPercent === 0 && row.maxPercent === 100)

    ) {

      return `${label}\n${Math.round(row.minPercent)}–${Math.round(row.maxPercent)}%`;

    }

    return label;

  }



  const chartConfig = $derived(() => {

    const config: Chart.ChartConfig = {

      count: { label: "Assessments", color: accentColor },

    };

    return config;

  });



  const yMax = $derived(Math.max(1, ...chartData().map((d) => d.count)));



  const yScale = $derived(scaleLinear().domain([0, yMax]).nice());



  const totalAssessments = $derived(distribution().gradedCount);



  const modeOptionLabel = $derived(

    DISTRIBUTION_MODE_OPTIONS.find((o) => o.value === distributionMode)?.label ??

      "Auto",

  );



  const subtitle = $derived(() => {

    const d = distribution();

    if (d.modeUsed === "letter") {

      return `Assessments per letter grade · ${getTimeRangeLabel(timeRange)}`;

    }

    return `Assessments per grade band · ${getTimeRangeLabel(timeRange)}`;

  });



  onMount(async () => {

    try {

      const info = await getUserInfo();

      if (info?.id) {

        studentId = info.id;

        const saved = await loadDistributionMode(location.origin, info.id);

        if (saved) distributionMode = saved;

      }

    } catch {

      /* use default */

    } finally {

      modeReady = true;

    }

  });



  async function onModeChange(next: DistributionMode) {

    distributionMode = next;

    if (studentId != null) {

      await saveDistributionMode(location.origin, studentId, next);

    }

  }

</script>



<article class="bsplus-analytics-card">

  <header class="bsplus-analytics-card-header bsplus-analytics-card-header-split">

    <div>

      <h3 class="bsplus-analytics-card-title">Grade distribution</h3>

      <p class="bsplus-analytics-card-desc">{subtitle()}</p>

    </div>

    <div class="bsplus-analytics-card-controls">

      <label class="bsplus-analytics-card-control">

        <span class="bsplus-analytics-field-label">Grouping</span>

        <select

          class="bsplus-analytics-select bsplus-analytics-select-compact"

          value={distributionMode}

          disabled={!modeReady}

          aria-label="Grade distribution grouping"

          onchange={(e) => onModeChange(e.currentTarget.value as DistributionMode)}

        >

          {#each DISTRIBUTION_MODE_OPTIONS as option}

            <option value={option.value} title={option.description}>{option.label}</option>

          {/each}

        </select>

      </label>

    </div>

  </header>



  <div class="bsplus-analytics-card-body">

    {#if totalAssessments > 0 && chartData().length > 0}

      <Chart.Container config={chartConfig()} class="bsplus-chart-surface bsplus-chart-surface-bar w-full">

        <BarChart

          data={chartData()}

          xScale={scaleBand().padding(distribution().modeUsed === "letter" ? 0.22 : 0.28)}

          yScale={yScale()}

          x="grade"

          y="count"

          axis={true}

          grid={true}

          series={[

            {

              key: "count",

              label: "Assessments",

              color: accentColor,

            },

          ]}

          props={{

            bars: {

              stroke: "none",

              fill: accentColor,

              rounded: "all",

              radius: 10,

              insets: { top: 4, bottom: 0, left: 4, right: 4 },

              motion: {

                y: { type: "tween", duration: 600, easing: cubicInOut },

                height: { type: "tween", duration: 600, easing: cubicInOut },

              },

            },

            highlight: { area: { fill: "none" } },

            xAxis: {

              format: (d: string) => formatXTick(d),

              tickMultiline: useLetterScaleLabels(),

              tickLabelProps: useLetterScaleLabels()

                ? { class: "bsplus-bar-tick-label" }

                : undefined,

            },

            yAxis: {

              label: "Assessments",

              format: (d: number) => (Number.isInteger(d) ? String(d) : ""),

              ticks: 5,

            },

          }}

        >

          {#snippet tooltip()}

            <Chart.Tooltip hideLabel />

          {/snippet}

        </BarChart>

      </Chart.Container>

    {:else}

      <div class="bsplus-analytics-card-empty">

        <strong>No graded assessments</strong>

        <span>for {getTimeRangeLabel(timeRange).toLowerCase()}</span>

      </div>

    {/if}

  </div>



  <footer class="bsplus-analytics-card-footer">

    {#if distribution().modeUsed === "letter" && distribution().scaleLabel}

      <p class="bsplus-analytics-scale-hint">{distribution().scaleLabel}</p>

    {/if}

    <p>

      {#if distribution().averagePercent !== null}

        Average <strong>{distribution().averagePercent}%</strong>

      {:else}

        Average <strong>—</strong>

      {/if}

      across {totalAssessments} assessment{totalAssessments === 1 ? "" : "s"}

      {#if distributionMode === "auto" && distribution().modeUsed === "letter"}

        <span class="bsplus-analytics-footer-muted"> · letter scale detected</span>

      {:else if distributionMode !== "auto"}

        <span class="bsplus-analytics-footer-muted"> · {modeOptionLabel} grouping</span>

      {/if}

    </p>

  </footer>

</article>

