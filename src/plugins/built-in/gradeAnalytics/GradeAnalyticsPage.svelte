<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import type {
    AnalyticsClassGroup,
    AnalyticsClassOption,
    Assessment,
  } from "./types";
  import {
    loadGradeAnalytics,
    syncGradeAnalytics,
    getCacheTtlMs,
    loadAnalyticsClassCatalog,
    getStudentId,
  } from "./api";
  import AnalyticsAreaChart from "./AnalyticsAreaChart.svelte";
  import AnalyticsBarChart from "./AnalyticsBarChart.svelte";
  import AssessmentTable from "./AssessmentTable.svelte";
  import GradeRangeSlider from "./GradeRangeSlider.svelte";
  import ClassGroupsPanel from "./ClassGroupsPanel.svelte";
  import GradeInferencePanel from "./GradeInferencePanel.svelte";
  import {
    defaultCustomTimeRange,
    filterAssessmentsByTimeRange,
    getTimeRangeLabel,
    TIME_RANGE_OPTIONS,
    type CustomTimeRange,
    type TimeRange,
  } from "./timeRange";
  import { openAnalyticsPrivacyPopup } from "./openAnalyticsPrivacyPopup";
  import { animationsEnabled } from "@/seqta/utils/performanceMode";
  import {
    DEFAULT_ANALYTICS_GRADE_INFERENCE,
    type AnalyticsGradeInferenceSettings,
  } from "./gradeInferenceSettings";
  import {
    loadClassGroups,
    loadGradeInferenceSettings,
    saveClassGroups,
    saveGradeInferenceSettings,
  } from "./storage";

  let { simpleMode = false } = $props<{ simpleMode?: boolean }>();

  const LOAD_ERROR =
    "Unable to load analytics. Check your connection, then select Refresh data.";
  const SYNC_ERROR_WITH_DATA =
    "Unable to sync. Showing saved data. Select Refresh data to try again.";

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
  let customTimeRange: CustomTimeRange = $state(defaultCustomTimeRange());
  let showSubjectTrends = $state(false);
  let classGroups: AnalyticsClassGroup[] = $state([]);
  let classCatalog: AnalyticsClassOption[] = $state([]);
  let activeClassGroupId: string | null = $state(null);
  let studentId: number | null = $state(null);
  let gradeInference = $state<AnalyticsGradeInferenceSettings>(
    DEFAULT_ANALYTICS_GRADE_INFERENCE,
  );

  let timeRangeTrigger: HTMLButtonElement | null = $state(null);
  let subjectsTrigger: HTMLButtonElement | null = $state(null);

  let timestampInterval: ReturnType<typeof setInterval> | null = null;
  let contentReady = $state(false);
  const fadeDuration = $derived(animationsEnabled() ? 200 : 0);

  const showLoading = $derived(loading || !contentReady);
  const hasData = $derived(!!analyticsData?.length);
  const totalCount = $derived(analyticsData?.length ?? 0);

  const formattedTimestamp = $derived.by(() => {
    timestampRefresh;
    return lastUpdated ? formatLastUpdated(lastUpdated) : "";
  });

  const activeClassGroup = $derived(
    classGroups.find((g) => g.id === activeClassGroupId) ?? null,
  );

  const activeClassKeys = $derived(activeClassGroup?.classKeys ?? []);

  const combinedChartLabel = $derived(
    activeClassGroup && !showSubjectTrends ? activeClassGroup.name : undefined,
  );

  const uniqueSubjects = $derived.by(() => {
    if (!analyticsData) return [];
    return [...new Set(analyticsData.map((a) => a.subject))].sort();
  });

  const filteredData = $derived.by(() => {
    if (!analyticsData) return [];
    const [minG, maxG] = gradeRange;
    const query = filterSearch.toLowerCase();
    return analyticsData.filter((a) => {
      if (activeClassKeys.length) {
        const key = `${a.programmeID}-${a.metaclassID}`;
        if (!activeClassKeys.includes(key)) return false;
      } else if (filterSubjects.length && !filterSubjects.includes(a.subject)) {
        return false;
      }
      if (a.finalGrade !== undefined) {
        if (a.finalGrade < minG || a.finalGrade > maxG) return false;
      }
      if (
        query &&
        !a.title.toLowerCase().includes(query) &&
        !a.subject.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  });

  const timeScopedData = $derived(
    filterAssessmentsByTimeRange(filteredData, timeRange, customTimeRange),
  );

  const gradedFiltered = $derived(
    timeScopedData.filter((a) => a.finalGrade !== undefined),
  );

  const statsAverage = $derived.by(() => {
    if (!gradedFiltered.length) return null;
    const sum = gradedFiltered.reduce((acc, a) => acc + (a.finalGrade ?? 0), 0);
    return Math.round((sum / gradedFiltered.length) * 10) / 10;
  });

  const statsSubjectCount = $derived(
    new Set(timeScopedData.map((a) => a.subject)).size,
  );

  const timeRangeLabel = $derived(getTimeRangeLabel(timeRange, customTimeRange));

  const subjectsLabel = $derived.by(() => {
    if (activeClassGroup) return activeClassGroup.name;
    if (filterSubjects.length === 0) return "All subjects";
    if (filterSubjects.length === 1) return filterSubjects[0];
    return `${filterSubjects.length} selected`;
  });

  const hasActiveFilters = $derived(
    !!(
      filterSubjects.length ||
      activeClassGroupId ||
      filterSearch ||
      gradeRange[0] !== 0 ||
      gradeRange[1] !== 100
    ),
  );

  const resultsSummary = $derived.by(() => {
    const shown = `${timeScopedData.length} of ${totalCount} assessments shown`;
    return gradedFiltered.length !== timeScopedData.length
      ? `${shown} (${gradedFiltered.length} with grades)`
      : shown;
  });

  const statusMessage = $derived.by(() => {
    if (loading) return "Loading analytics…";
    if (syncing) return "Syncing analytics…";
    return hasData ? resultsSummary : "";
  });

  function formatLastUpdated(date: Date): string {
    const diffMs = Date.now() - date.getTime();
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
      await loadClassCatalog(result.assessments);
    } catch (e) {
      console.error("[BetterSEQTA+] Analytics sync failed:", e);
      error = analyticsData?.length ? SYNC_ERROR_WITH_DATA : LOAD_ERROR;
    } finally {
      syncing = false;
    }
  }

  function clearFilters() {
    filterSubjects = [];
    filterSearch = "";
    gradeRange = [0, 100];
    activeClassGroupId = null;
  }

  function toggleSubject(subject: string) {
    activeClassGroupId = null;
    if (filterSubjects.includes(subject)) {
      filterSubjects = filterSubjects.filter((s) => s !== subject);
    } else {
      filterSubjects = [...filterSubjects, subject];
    }
  }

  function selectAllSubjects() {
    filterSubjects = [];
    activeClassGroupId = null;
    showSubjectsDropdown = false;
    subjectsTrigger?.focus();
  }

  function selectClassGroup(group: AnalyticsClassGroup | null) {
    activeClassGroupId = group?.id ?? null;
    if (group) {
      filterSubjects = [];
      showSubjectTrends = false;
    }
  }

  async function persistClassGroups(groups: AnalyticsClassGroup[]) {
    classGroups = groups;
    if (activeClassGroupId && !groups.some((g) => g.id === activeClassGroupId)) {
      activeClassGroupId = null;
    }
    if (studentId == null) return;
    await saveClassGroups(location.origin, studentId, groups);
  }

  async function persistGradeInference(settings: AnalyticsGradeInferenceSettings) {
    gradeInference = settings;
    if (studentId == null) return;
    await saveGradeInferenceSettings(location.origin, studentId, settings);
    await runSync();
  }

  async function loadClassCatalog(assessments: Assessment[]) {
    classCatalog = await loadAnalyticsClassCatalog(assessments);
  }

  function toggleTimeRangeDropdown() {
    showSubjectsDropdown = false;
    showTimeRangeDropdown = !showTimeRangeDropdown;
  }

  function toggleSubjectsDropdown() {
    showTimeRangeDropdown = false;
    showSubjectsDropdown = !showSubjectsDropdown;
  }

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

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    if (showTimeRangeDropdown) {
      showTimeRangeDropdown = false;
      timeRangeTrigger?.focus();
    } else if (showSubjectsDropdown) {
      showSubjectsDropdown = false;
      subjectsTrigger?.focus();
    }
  }

  function selectTimeRange(value: TimeRange) {
    timeRange = value;
    if (value === "custom") customTimeRange = defaultCustomTimeRange();
    showTimeRangeDropdown = false;
    timeRangeTrigger?.focus();
  }

  onMount(async () => {
    timestampInterval = setInterval(() => {
      timestampRefresh = Date.now();
    }, 60000);

    try {
      const result = await loadGradeAnalytics();
      analyticsData = result.assessments;
      lastUpdated = result.updatedAt ? new Date(result.updatedAt) : null;

      try {
        const id = await getStudentId();
        studentId = id;
        classGroups = await loadClassGroups(location.origin, id);
        gradeInference = await loadGradeInferenceSettings(location.origin, id);
      } catch (e) {
        console.warn(
          "[BetterSEQTA+] Analytics student settings unavailable; class groups will not be saved:",
          e,
        );
        classGroups = [];
      }
      await loadClassCatalog(result.assessments);
    } catch (e) {
      console.error("[BetterSEQTA+] Failed to load analytics:", e);
      analyticsData = [];
      error = LOAD_ERROR;
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
  onkeydown={handleWindowKeydown}
/>

<div class="bsplus-analytics-root">
  <p class="bsplus-analytics-sr-only" role="status">{statusMessage}</p>

  {#if error && hasData}
    <p class="bsplus-analytics-alert bsplus-analytics-animate" role="alert" transition:fade={{ duration: fadeDuration }}>
      {error}
    </p>
  {/if}

  <div class="bsplus-analytics-layout bsplus-analytics-animate">
    <aside class="bsplus-analytics-filters" aria-label="Analytics controls">
      <header class="bsplus-analytics-sidebar-head bsplus-analytics-animate">
        <h1>Analytics</h1>
        {#if syncing}
          <span class="bsplus-analytics-badge">
            <span class="bsplus-analytics-badge-dot" aria-hidden="true"></span>
            Syncing
          </span>
        {/if}
      </header>

      {#if !showLoading && hasData}
        <div class="bsplus-analytics-filters-head">
          <h2 class="bsplus-analytics-filters-title">Filters</h2>
          {#if hasActiveFilters}
            <button
              type="button"
              class="bsplus-analytics-filters-clear"
              onclick={clearFilters}
            >
              Clear all
            </button>
          {/if}
        </div>

        <div class="bsplus-analytics-filter-group">
          <span class="bsplus-analytics-field-label" id="bsplus-analytics-time-label">Time period</span>
          <div class="bsplus-analytics-dropdown" data-analytics-dropdown>
            <button
              bind:this={timeRangeTrigger}
              type="button"
              id="bsplus-analytics-time-trigger"
              class="bsplus-analytics-dropdown-trigger"
              aria-expanded={showTimeRangeDropdown}
              aria-controls="bsplus-analytics-time-menu"
              aria-labelledby="bsplus-analytics-time-label bsplus-analytics-time-trigger"
              onclick={toggleTimeRangeDropdown}
            >
              {timeRangeLabel}
            </button>
            {#if showTimeRangeDropdown}
              <div id="bsplus-analytics-time-menu" class="bsplus-analytics-dropdown-menu">
                {#each TIME_RANGE_OPTIONS as option (option.value)}
                  {@const selected = timeRange === option.value}
                  <button
                    type="button"
                    class="bsplus-analytics-dropdown-item"
                    class:is-selected={selected}
                    aria-pressed={selected}
                    onclick={() => selectTimeRange(option.value)}
                  >
                    <span class="bsplus-analytics-dropdown-check" aria-hidden="true">{selected ? "✓" : ""}</span>
                    <span>{option.label}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
          {#if timeRange === "custom"}
            <div class="bsplus-analytics-date-range">
              <label class="bsplus-analytics-date-field">
                <span class="bsplus-analytics-field-label">From</span>
                <input
                  type="date"
                  class="bsplus-analytics-input"
                  bind:value={customTimeRange.from}
                  max={customTimeRange.to}
                />
              </label>
              <label class="bsplus-analytics-date-field">
                <span class="bsplus-analytics-field-label">To</span>
                <input
                  type="date"
                  class="bsplus-analytics-input"
                  bind:value={customTimeRange.to}
                  min={customTimeRange.from}
                />
              </label>
            </div>
          {/if}
        </div>

        <div class="bsplus-analytics-filter-group">
          <span class="bsplus-analytics-field-label" id="bsplus-analytics-subjects-label">Subjects</span>
          <div class="bsplus-analytics-dropdown" data-analytics-dropdown>
            <button
              bind:this={subjectsTrigger}
              type="button"
              id="bsplus-analytics-subjects-trigger"
              class="bsplus-analytics-dropdown-trigger"
              aria-expanded={showSubjectsDropdown}
              aria-controls="bsplus-analytics-subjects-menu"
              aria-labelledby="bsplus-analytics-subjects-label bsplus-analytics-subjects-trigger"
              onclick={toggleSubjectsDropdown}
            >
              {subjectsLabel}
            </button>
            {#if showSubjectsDropdown}
              {@const allSelected = !activeClassGroup && filterSubjects.length === 0}
              <div id="bsplus-analytics-subjects-menu" class="bsplus-analytics-dropdown-menu">
                <button
                  type="button"
                  class="bsplus-analytics-dropdown-item"
                  class:is-selected={allSelected}
                  aria-pressed={allSelected}
                  onclick={selectAllSubjects}
                >
                  <span class="bsplus-analytics-dropdown-check" aria-hidden="true">{allSelected ? "✓" : ""}</span>
                  <span>All subjects</span>
                </button>
                {#each uniqueSubjects as subject (subject)}
                  {@const selected = filterSubjects.includes(subject)}
                  <button
                    type="button"
                    class="bsplus-analytics-dropdown-item"
                    class:is-selected={selected}
                    aria-pressed={selected}
                    onclick={() => toggleSubject(subject)}
                  >
                    <span class="bsplus-analytics-dropdown-check" aria-hidden="true">{selected ? "✓" : ""}</span>
                    <span class="bsplus-analytics-filter-subject-name">{subject}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        {#if !simpleMode}
          <ClassGroupsPanel
            classOptions={classCatalog}
            groups={classGroups}
            activeGroupId={activeClassGroupId}
            onSelectGroup={selectClassGroup}
            onSaveGroups={persistClassGroups}
          />

          <GradeInferencePanel
            settings={gradeInference}
            onSave={persistGradeInference}
            disabled={syncing}
          />
        {/if}

        <div class="bsplus-analytics-filter-group">
          <label class="bsplus-analytics-field-label" for="bsplus-analytics-search">Search</label>
          <input
            id="bsplus-analytics-search"
            type="search"
            class="bsplus-analytics-input"
            bind:value={filterSearch}
            placeholder="Search assessments…"
          />
        </div>

        {#if !simpleMode}
          <div
            class="bsplus-analytics-filter-group"
            role="group"
            aria-labelledby="bsplus-analytics-grade-label"
          >
            <span class="bsplus-analytics-field-label" id="bsplus-analytics-grade-label">Grade range</span>
            <GradeRangeSlider bind:value={gradeRange} />
          </div>

          <div class="bsplus-analytics-filter-group">
            <label class="bsplus-analytics-checkbox">
              <input type="checkbox" bind:checked={showSubjectTrends} />
              <span class="bsplus-analytics-checkmark" aria-hidden="true"></span>
              <span>Per-subject trends</span>
            </label>
          </div>
        {/if}
      {/if}

      <div class="bsplus-analytics-sidebar-actions">
        {#if lastUpdated}
          <p class="bsplus-analytics-meta">Last updated: {formattedTimestamp}</p>
        {/if}
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
    </aside>

    <div class="bsplus-analytics-main">
      {#if showLoading}
        <div class="bsplus-analytics-loading">
          <div class="bsplus-analytics-spinner" aria-hidden="true"></div>
          <p class="bsplus-analytics-meta">Loading analytics…</p>
        </div>
      {:else if hasData}
        <div class="bsplus-analytics-stats bsplus-analytics-animate" aria-label="Summary statistics">
          <div class="bsplus-analytics-stat">
            <div class="bsplus-analytics-stat-label">Average grade</div>
            <div class="bsplus-analytics-stat-value">
              {statsAverage !== null ? `${statsAverage}%` : "—"}
            </div>
          </div>
          <div class="bsplus-analytics-stat">
            <div class="bsplus-analytics-stat-label">Graded shown</div>
            <div class="bsplus-analytics-stat-value">{gradedFiltered.length}</div>
          </div>
          <div class="bsplus-analytics-stat">
            <div class="bsplus-analytics-stat-label">Subjects</div>
            <div class="bsplus-analytics-stat-value">{statsSubjectCount}</div>
          </div>
        </div>

        <div class="bsplus-analytics-results bsplus-analytics-animate">
          {#if !simpleMode}
            <div class="bsplus-analytics-charts">
              <div class="bsplus-analytics-chart-cell">
                <AnalyticsAreaChart
                  data={gradedFiltered}
                  {timeRange}
                  {customTimeRange}
                  {showSubjectTrends}
                  combinedLabel={combinedChartLabel}
                />
              </div>
              <div class="bsplus-analytics-chart-cell">
                <AnalyticsBarChart data={gradedFiltered} {timeRange} {customTimeRange} />
              </div>
            </div>
          {/if}

          <AssessmentTable data={timeScopedData} />
        </div>

        <footer class="bsplus-analytics-footer bsplus-analytics-animate">
          <span>{resultsSummary}</span>
        </footer>
      {:else}
        <div class="bsplus-analytics-empty bsplus-analytics-animate">
          {#if error}
            <h2>Analytics unavailable</h2>
            <p role="alert">{error}</p>
          {:else}
            <h2>No analytics data yet</h2>
            <p>
              Data syncs when you visit this page. Assessments with released marks will
              appear here with trends and grade breakdowns.
            </p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
