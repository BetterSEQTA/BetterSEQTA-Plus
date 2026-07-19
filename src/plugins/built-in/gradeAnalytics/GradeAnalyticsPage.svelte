<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import type { Assessment } from "./types";
  import {
    loadGradeAnalytics,
    syncGradeAnalytics,
    getCacheTtlMs,
  } from "./api";
  import AnalyticsAreaChart from "./AnalyticsAreaChart.svelte";
  import AnalyticsBarChart from "./AnalyticsBarChart.svelte";
  import AssessmentTable from "./AssessmentTable.svelte";
  import GradeRangeSlider from "./GradeRangeSlider.svelte";
  import {
    filterAssessmentsByTimeRange,
    getTimeRangeLabel,
    TIME_RANGE_OPTIONS,
    type TimeRange,
  } from "./timeRange";
  import { openAnalyticsPrivacyPopup } from "./openAnalyticsPrivacyPopup";

  let analyticsData: Assessment[] | null = $state(null);
  let loading = $state(true);
  let syncing = $state(false);
  let lastUpdated: Date | null = $state(null);
  let timestampRefresh = $state(0);
  let error: string | null = $state(null);

  let filterSubjects: string[] = $state([]);
  let filterSearch = $state("");
  let gradeRange = $state([0, 100]);
  let showSubjectsDropdown = $state(false);
  let showTimeRangeDropdown = $state(false);
  let timeRange: TimeRange = $state("all");
  let showSubjectTrends = $state(false);

  let timestampInterval: ReturnType<typeof setInterval> | null = null;
  let contentReady = $state(false);

  const formattedTimestamp = $derived(() => {
    if (!lastUpdated) return "";
    timestampRefresh;
    return formatLastUpdated(lastUpdated);
  });

  const uniqueSubjects = $derived(() => {
    if (!analyticsData) return [];
    return [...new Set(analyticsData.map((a) => a.subject))].sort();
  });

  const filteredData = $derived(() => {
    if (!analyticsData) return [];
    const [minG, maxG] = gradeRange;
    return analyticsData.filter((a) => {
      if (filterSubjects.length && !filterSubjects.includes(a.subject)) return false;
      if (a.finalGrade !== undefined) {
        if (a.finalGrade < minG || a.finalGrade > maxG) return false;
      }
      if (
        filterSearch &&
        !a.title.toLowerCase().includes(filterSearch.toLowerCase()) &&
        !a.subject.toLowerCase().includes(filterSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  });

  const timeScopedData = $derived(() =>
    filterAssessmentsByTimeRange(filteredData(), timeRange),
  );

  const gradedFiltered = $derived(() =>
    timeScopedData().filter((a) => a.finalGrade !== undefined),
  );

  const statsAverage = $derived.by(() => {
    const graded = gradedFiltered();
    if (!graded.length) return null;
    const sum = graded.reduce((acc, a) => acc + (a.finalGrade ?? 0), 0);
    return Math.round((sum / graded.length) * 10) / 10;
  });

  const statsSubjectCount = $derived(
    new Set(timeScopedData().map((a) => a.subject)).size,
  );

  function formatLastUpdated(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    return date.toLocaleString();
  }

  async function runSync() {
    syncing = true;
    error = null;
    try {
      const result = await syncGradeAnalytics();
      analyticsData = result.assessments;
      lastUpdated = new Date(result.updatedAt);
    } catch (e) {
      console.error("[BetterSEQTA+] Analytics sync failed:", e);
      error =
        "Failed to sync analytics data. Showing cached data if available.";
    } finally {
      syncing = false;
    }
  }

  function clearFilters() {
    filterSubjects = [];
    filterSearch = "";
    gradeRange = [0, 100];
  }

  function hasActiveFilters() {
    return !!(
      filterSubjects.length ||
      filterSearch ||
      gradeRange[0] !== 0 ||
      gradeRange[1] !== 100
    );
  }

  function toggleSubject(subject: string) {
    if (filterSubjects.includes(subject)) {
      filterSubjects = filterSubjects.filter((s) => s !== subject);
    } else {
      filterSubjects = [...filterSubjects, subject];
    }
  }

  const timeRangeLabel = $derived(() => getTimeRangeLabel(timeRange));

  function closeToolbarDropdowns() {
    showSubjectsDropdown = false;
    showTimeRangeDropdown = false;
  }

  /** Shadow DOM retargets `event.target`; use the full composed path for outside-click. */
  function isInsideToolbarDropdown(event: Event): boolean {
    return event.composedPath().some((node) => {
      if (!(node instanceof Element)) return false;
      return node.closest("[data-analytics-dropdown]") !== null;
    });
  }

  function selectTimeRange(value: TimeRange) {
    timeRange = value;
    showTimeRangeDropdown = false;
  }

  onMount(async () => {
    timestampInterval = setInterval(() => {
      timestampRefresh = Date.now();
    }, 60000);

    try {
      const result = await loadGradeAnalytics();
      analyticsData = result.assessments;
      lastUpdated = result.updatedAt ? new Date(result.updatedAt) : null;
    } catch (e) {
      console.error("[BetterSEQTA+] Failed to load analytics:", e);
      analyticsData = [];
    } finally {
      loading = false;
      requestAnimationFrame(() => {
        contentReady = true;
      });
    }

    const ttl = getCacheTtlMs(24);
    const needsSync =
      !lastUpdated || Date.now() - lastUpdated.getTime() > ttl;
    if (needsSync) {
      void runSync();
    }
  });

  onDestroy(() => {
    if (timestampInterval) clearInterval(timestampInterval);
  });
</script>

<svelte:window
  onclick={(e) => {
    if (!isInsideToolbarDropdown(e)) {
      closeToolbarDropdowns();
    }
  }}
/>

<div class="bsplus-analytics-root">
  <header class="bsplus-analytics-header bsplus-analytics-animate">
    <div class="bsplus-analytics-header-text">
      <h1>
        Analytics
        {#if syncing}
          <span class="bsplus-analytics-badge">
            <span class="bsplus-analytics-badge-dot" aria-hidden="true"></span>
            Syncing
          </span>
        {/if}
      </h1>
      {#if lastUpdated && analyticsData && analyticsData.length > 0}
        <p class="bsplus-analytics-meta">Last updated: {formattedTimestamp()}</p>
      {/if}
    </div>
    <div class="bsplus-analytics-header-actions">
      <button
        type="button"
        class="bsplus-analytics-btn bsplus-analytics-btn-privacy"
        onclick={() => openAnalyticsPrivacyPopup()}
      >
        Privacy notice
      </button>
      <button
        type="button"
        class="bsplus-analytics-btn bsplus-analytics-btn-primary"
        disabled={syncing}
        onclick={() => runSync()}
      >
        {syncing ? "Syncing…" : "Refresh data"}
      </button>
    </div>
  </header>

  {#if error}
    <p class="bsplus-analytics-alert bsplus-analytics-animate" role="alert" transition:fade={{ duration: 200 }}>
      {error}
    </p>
  {/if}

  {#if loading || !contentReady}
    <div class="bsplus-analytics-loading bsplus-analytics-animate">
      <div class="bsplus-analytics-spinner" aria-label="Loading analytics"></div>
    </div>
  {:else if analyticsData && analyticsData.length > 0}
    <div class="bsplus-analytics-layout bsplus-analytics-animate bsplus-analytics-delay-1">
      <aside class="bsplus-analytics-filters" aria-label="Filters">
        <div class="bsplus-analytics-filters-head">
          <h2 class="bsplus-analytics-filters-title">Filters</h2>
          {#if hasActiveFilters()}
            <button
              type="button"
              class="bsplus-analytics-filters-clear"
              onclick={clearFilters}
            >
              Clear all
            </button>
          {/if}
        </div>

        <div class="bsplus-analytics-filter-group" data-analytics-dropdown>
          <span class="bsplus-analytics-field-label">Time period</span>
          <div class="bsplus-analytics-dropdown" data-analytics-dropdown>
            <button
              type="button"
              class="bsplus-analytics-dropdown-trigger"
              onclick={(e) => {
                e.stopPropagation();
                showSubjectsDropdown = false;
                showTimeRangeDropdown = !showTimeRangeDropdown;
              }}
              aria-expanded={showTimeRangeDropdown}
              aria-haspopup="listbox"
              aria-label="Time period for analytics"
            >
              {timeRangeLabel()}
            </button>
            {#if showTimeRangeDropdown}
              <div class="bsplus-analytics-dropdown-menu" role="listbox">
                {#each TIME_RANGE_OPTIONS as option (option.value)}
                  {@const selected = timeRange === option.value}
                  <button
                    type="button"
                    class="bsplus-analytics-dropdown-item"
                    class:is-selected={selected}
                    role="option"
                    aria-selected={selected}
                    onclick={() => selectTimeRange(option.value)}
                  >
                    <span class="bsplus-analytics-dropdown-check"
                      >{selected ? "✓" : ""}</span
                    >
                    <span>{option.label}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="bsplus-analytics-filter-group" data-analytics-dropdown>
          <span class="bsplus-analytics-field-label">Subjects</span>
          <div class="bsplus-analytics-dropdown" data-analytics-dropdown>
            <button
              type="button"
              class="bsplus-analytics-dropdown-trigger"
              onclick={(e) => {
                e.stopPropagation();
                showTimeRangeDropdown = false;
                showSubjectsDropdown = !showSubjectsDropdown;
              }}
              aria-expanded={showSubjectsDropdown}
              aria-haspopup="listbox"
            >
              {#if filterSubjects.length === 0}
                All subjects
              {:else if filterSubjects.length === 1}
                {filterSubjects[0]}
              {:else}
                {filterSubjects.length} selected
              {/if}
            </button>
            {#if showSubjectsDropdown}
              <div class="bsplus-analytics-dropdown-menu" role="listbox">
                <button
                  type="button"
                  class="bsplus-analytics-dropdown-item"
                  class:is-selected={filterSubjects.length === 0}
                  onclick={() => {
                    filterSubjects = [];
                    showSubjectsDropdown = false;
                  }}
                >
                  <span class="bsplus-analytics-dropdown-check"
                    >{filterSubjects.length === 0 ? "✓" : ""}</span
                  >
                  All subjects
                </button>
                {#each uniqueSubjects() as subject}
                  {@const selected = filterSubjects.includes(subject)}
                  <button
                    type="button"
                    class="bsplus-analytics-dropdown-item"
                    class:is-selected={selected}
                    onclick={() => toggleSubject(subject)}
                  >
                    <span class="bsplus-analytics-dropdown-check"
                      >{selected ? "✓" : ""}</span
                    >
                    <span class="bsplus-analytics-filter-subject-name">{subject}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="bsplus-analytics-filter-group">
          <span class="bsplus-analytics-field-label">Search</span>
          <input
            type="search"
            class="bsplus-analytics-input"
            bind:value={filterSearch}
            placeholder="Search assessments…"
          />
        </div>

        <div class="bsplus-analytics-filter-group">
          <span class="bsplus-analytics-field-label">Grade range</span>
          <GradeRangeSlider bind:value={gradeRange} />
        </div>

        <div class="bsplus-analytics-filter-group">
          <label class="bsplus-analytics-checkbox">
            <input type="checkbox" bind:checked={showSubjectTrends} />
            <span class="bsplus-analytics-checkmark" aria-hidden="true"></span>
            <span>Per-subject trends</span>
          </label>
        </div>
      </aside>

      <div class="bsplus-analytics-main">
        <div class="bsplus-analytics-stats" aria-label="Summary statistics">
          <div class="bsplus-analytics-stat">
            <div class="bsplus-analytics-stat-label">Average grade</div>
            <div class="bsplus-analytics-stat-value bsplus-analytics-stat-value-accent">
              {statsAverage !== null ? `${statsAverage}%` : "—"}
            </div>
          </div>
          <div class="bsplus-analytics-stat">
            <div class="bsplus-analytics-stat-label">Graded shown</div>
            <div class="bsplus-analytics-stat-value">{gradedFiltered().length}</div>
          </div>
          <div class="bsplus-analytics-stat">
            <div class="bsplus-analytics-stat-label">Subjects</div>
            <div class="bsplus-analytics-stat-value">{statsSubjectCount}</div>
          </div>
        </div>

        <div class="bsplus-analytics-results">
          <div class="bsplus-analytics-charts">
            <div class="bsplus-analytics-chart-cell">
              <AnalyticsAreaChart
                data={gradedFiltered()}
                {timeRange}
                showSubjectTrends={showSubjectTrends}
              />
            </div>
            <div class="bsplus-analytics-chart-cell">
              <AnalyticsBarChart data={gradedFiltered()} {timeRange} />
            </div>
          </div>

          <AssessmentTable data={timeScopedData()} />
        </div>

        <footer class="bsplus-analytics-footer">
          <span>
            {timeScopedData().length} of {analyticsData.length} assessments shown
            {#if gradedFiltered().length !== timeScopedData().length}
              ({gradedFiltered().length} with grades)
            {/if}
          </span>
        </footer>
      </div>
    </div>
  {:else}
    <div class="bsplus-analytics-empty bsplus-analytics-animate" transition:fade={{ duration: 300 }}>
      <h2>No analytics data yet</h2>
      <p>
        Data syncs when you visit this page. Assessments with released marks will
        appear here with trends and grade breakdowns.
      </p>
      <button
        type="button"
        class="bsplus-analytics-btn bsplus-analytics-btn-primary"
        disabled={syncing}
        onclick={() => runSync()}
      >
        Sync now
      </button>
    </div>
  {/if}
</div>
