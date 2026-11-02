<script lang="ts">
  import {
    assessmentHasGradeDisplay,
    determineStatus,
    formatDate,
    getDisplayGrade,
    getThermoscorePercent,
    readStoredList,
  } from "./utils";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
  import { buildEngageAssessmentPagePath } from "@/seqta/utils/engageAssessmentStudent";
  import OverviewIcon from "./OverviewIcon.svelte";
  import {
    GROUP_SORT_ICONS,
    STATUS_COLUMN_ICONS,
    type OverviewIconName,
  } from "./icons";
  import confetti from "canvas-confetti";

  let { data }: { data: any } = $props();

  interface FilterOptions {
    subject: string;
    student: string;
    sortBy: "due" | "grade" | "subject" | "title" | "year";
  }

  type Column = {
    key: string;
    title: string;
    className: string;
    icon: OverviewIconName;
  };

  const HIDDEN_ASSESSMENTS_KEY = "betterseqta-hidden-assessments";
  const COMPLETED_ASSESSMENTS_KEY = "betterseqta-completed-assessments";

  const STATUS_COLUMNS: Column[] = [
    { key: "UPCOMING", title: "Upcoming", className: "column-upcoming", icon: "calendar-days" },
    { key: "DUE_SOON", title: "Due Soon", className: "column-due-soon", icon: "clock" },
    { key: "OVERDUE", title: "Overdue", className: "column-overdue", icon: "exclamation-triangle" },
    { key: "SUBMITTED", title: "Submitted", className: "column-submitted", icon: "document-check" },
    { key: "MARKS_RELEASED", title: "Marked", className: "column-marked", icon: "check-circle" },
  ];

  const isEngage = isSeqtaEngageExperience();

  let currentFilters = $state<FilterOptions>({
    subject: "all",
    student: "all",
    sortBy: "due",
  });
  let subjectFilters = $state<Record<string, boolean>>(initSubjectFilters());
  let hiddenIds = $state(readStoredList(HIDDEN_ASSESSMENTS_KEY).map(String));
  let completedIds = $state(readStoredList(COMPLETED_ASSESSMENTS_KEY));
  let openMenuId = $state<string | null>(null);
  let showVisibilityPanel = $state(false);

  const showStudentFilter = $derived(isEngage && (data?.students?.length ?? 0) > 1);
  const board = $derived(buildGroupsAndColumns());
  const hiddenSubjects = $derived(
    data?.subjects?.filter((s: any) => subjectFilters[s.code] === false) ?? [],
  );
  const hiddenAssessmentsWithInfo = $derived(
    data?.assessments?.filter((a: any) => hiddenIds.includes(String(a.id))) ?? [],
  );
  const hasHiddenItems = $derived(
    hiddenSubjects.length > 0 || hiddenAssessmentsWithInfo.length > 0,
  );

  function initSubjectFilters(): Record<string, boolean> {
    const filters = { ...(settingsState.subjectfilters || {}) };
    const missing = (data?.subjects ?? []).filter((s: any) => !Object.hasOwn(filters, s.code));
    if (missing.length) {
      for (const s of missing) filters[s.code] = true;
      settingsState.subjectfilters = filters;
    }
    return filters;
  }

  function setSubjectVisible(subjectCode: string, visible: boolean) {
    subjectFilters[subjectCode] = visible;
    settingsState.subjectfilters = $state.snapshot(subjectFilters);
  }

  function saveHiddenIds(ids: string[]) {
    hiddenIds = ids;
    localStorage.setItem(HIDDEN_ASSESSMENTS_KEY, JSON.stringify(ids));
  }

  function saveCompletedIds(ids: unknown[]) {
    completedIds = ids;
    localStorage.setItem(COMPLETED_ASSESSMENTS_KEY, JSON.stringify(ids));
  }

  function isLetterGradeMode(): boolean {
    const allSettings = settingsState.getAll() as unknown as Record<
      string,
      { lettergrade?: boolean } | undefined
    >;
    return allSettings["plugin.assessments-average.settings"]?.lettergrade ?? false;
  }

  function statusOf(assessment: any): string {
    return determineStatus(assessment, completedIds);
  }

  function getAssessmentYear(a: any): number {
    const dateStr = a.due || a.date || a.dueDate || a.created;
    return dateStr ? new Date(dateStr).getFullYear() : 0;
  }

  function getGroupKey(assessment: any): string {
    switch (currentFilters.sortBy) {
      case "year":
        return String(getAssessmentYear(assessment) || "Unknown");
      case "subject":
        return assessment.code || "Unknown";
      case "grade":
        return getDisplayGrade(assessment, isLetterGradeMode());
      case "title": {
        const first = (assessment.title || "?")[0].toUpperCase();
        return /[A-Z0-9]/.test(first) ? first : "#";
      }
      default:
        return statusOf(assessment);
    }
  }

  function sortCompare(a: any, b: any): number {
    return new Date(a.due || a.date || 0).getTime() - new Date(b.due || b.date || 0).getTime();
  }

  function buildGroupsAndColumns(): {
    filteredAssessments: any[];
    statusGroups: Record<string, any[]>;
    columns: Column[];
  } {
    if (!data?.assessments) return { filteredAssessments: [], statusGroups: {}, columns: [] };

    const filtered: any[] = data.assessments.filter((a: any) => {
      if (hiddenIds.includes(String(a.id))) return false;
      if (subjectFilters[a.code] === false) return false;
      if (currentFilters.subject !== "all" && a.code !== currentFilters.subject) return false;
      if (isEngage && currentFilters.student !== "all" && String(a.studentId) !== currentFilters.student) {
        return false;
      }
      return true;
    });

    const groups = Object.groupBy(filtered, getGroupKey) as Record<string, any[]>;
    for (const group of Object.values(groups)) group.sort(sortCompare);

    if (currentFilters.sortBy === "due") {
      return { filteredAssessments: filtered, statusGroups: groups, columns: STATUS_COLUMNS };
    }

    const icon = GROUP_SORT_ICONS[currentFilters.sortBy] ?? "queue-list";
    const keys = Object.keys(groups);
    const subjectTitles = new Map<string, string>(
      data?.subjects?.map((s: any) => [s.code, `${s.code} - ${s.title}`]) ?? [],
    );
    const sorted =
      currentFilters.sortBy === "year" ? keys.sort((a, b) => Number(b) - Number(a)) : keys.sort();
    const columns = sorted.map((key) => ({
      key,
      title: currentFilters.sortBy === "subject" ? (subjectTitles.get(key) ?? key) : key,
      className: "column-custom",
      icon,
    }));

    return { filteredAssessments: filtered, statusGroups: groups, columns };
  }

  function getDueDateClass(assessment: any): string {
    switch (statusOf(assessment)) {
      case "OVERDUE":
        return "overdue";
      case "DUE_SOON":
        return "due-soon";
      case "UPCOMING":
        return "upcoming";
      default:
        return "";
    }
  }

  function markAssessmentCompleted(assessment: any) {
    if (completedIds.includes(assessment.id)) return;
    saveCompletedIds([...completedIds, assessment.id]);
    checkForCelebration();
  }

  function unmarkAssessmentCompleted(assessment: any) {
    saveCompletedIds(completedIds.filter((id) => id !== assessment.id));
  }

  function hideAssessment(assessment: any) {
    const id = String(assessment.id);
    if (hiddenIds.includes(id)) return;
    saveHiddenIds([...hiddenIds, id]);
    closeAllMenus();
  }

  function unhideAssessment(assessmentId: string) {
    saveHiddenIds(hiddenIds.filter((id) => id !== String(assessmentId)));
  }

  function hideSubject(subjectCode: string) {
    setSubjectVisible(subjectCode, false);
    closeAllMenus();
  }

  function fireConfetti(options: confetti.Options) {
    try {
      confetti({ disableForReducedMotion: true, ...options });
    } catch (e) {
      console.log("Confetti celebration failed:", e);
    }
  }

  function checkForCelebration() {
    const overdueCount = board.statusGroups.OVERDUE?.length || 0;
    const dueSoonCount = board.statusGroups.DUE_SOON?.length || 0;

    if (overdueCount === 0 && dueSoonCount === 0) {
      setTimeout(() => {
        const end = Date.now() + 100;
        const side = { particleCount: 17, spread: 65, startVelocity: 40, scalar: 2, gravity: 2, decay: 0.97, ticks: 300 };
        const frame = () => {
          fireConfetti({ ...side, angle: 60, drift: 0.8, origin: { x: 0, y: 1 } });
          fireConfetti({ ...side, angle: 120, drift: -0.8, origin: { x: 1, y: 1 } });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      }, 500);
    } else if (overdueCount === 0 || dueSoonCount === 0) {
      setTimeout(() => {
        fireConfetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, scalar: 0.9 });
      }, 500);
    }
  }

  function handleCardClick(assessment: any, event: Event) {
    if ((event.target as HTMLElement).closest(".card-menu")) return;

    if (isEngage) {
      const studentId = assessment.studentId ?? data?.studentId;
      if (!studentId) return;
      window.location.hash = buildEngageAssessmentPagePath(
        studentId,
        assessment.programmeID,
        assessment.metaclassID,
        assessment.id,
      );
      return;
    }

    window.location.hash = `#?page=/assessments/${assessment.programmeID}:${assessment.metaclassID}&item=${assessment.id}`;
  }

  function toggleMenu(assessmentId: string, event: Event) {
    event.stopPropagation();
    openMenuId = openMenuId === assessmentId ? null : assessmentId;
  }

  function closeAllMenus() {
    openMenuId = null;
  }
</script>

<svelte:window onclick={closeAllMenus} />

<div class="bsplus-overview-page">
  <header class="grid-view-header bsplus-overview-animate">
    <div class="grid-view-header-text">
      <h1 class="grid-view-title">Assessments</h1>
      <p class="grid-view-subtitle">Track upcoming tasks, submissions, and released marks</p>
    </div>
    <div class="grid-view-filters bsplus-overview-toolbar">
      {#if showStudentFilter}
        <select class="filter-select" bind:value={currentFilters.student}>
          <option value="all">All Students</option>
          {#each data.students as student}
            <option value={String(student.id)}>{student.name}</option>
          {/each}
        </select>
      {/if}
      <select class="filter-select" bind:value={currentFilters.subject}>
        <option value="all">All Subjects</option>
        {#each data.subjects as subject}
          <option value={subject.code}>{subject.code} - {subject.title}</option>
        {/each}
      </select>
      <select class="filter-select" bind:value={currentFilters.sortBy} title="Group by - columns change based on this">
        <option value="due">Group: Status</option>
        <option value="year">Group: Year</option>
        <option value="subject">Group: Subject</option>
        <option value="grade">Group: Grade</option>
        <option value="title">Group: Title (A-Z)</option>
      </select>
      {#if hasHiddenItems}
        <button
          class="visibility-toggle"
          class:active={showVisibilityPanel}
          onclick={() => (showVisibilityPanel = !showVisibilityPanel)}
          title="Manage hidden subjects and assessments"
        >
          <OverviewIcon name="eye" size={18} />
          <span>Visibility ({hiddenSubjects.length + hiddenAssessmentsWithInfo.length})</span>
        </button>
      {/if}
    </div>
  </header>

  {#if showVisibilityPanel && hasHiddenItems}
    <div class="visibility-panel bsplus-overview-animate">
      <h4 class="visibility-panel-title">Hidden items</h4>
      {#if hiddenSubjects.length > 0}
        <div class="visibility-section">
          <span class="visibility-label">Subjects:</span>
          <div class="visibility-chips">
            {#each hiddenSubjects as subject}
              <span class="visibility-chip">
                {subject.code}
                <button class="visibility-unhide" onclick={() => setSubjectVisible(subject.code, true)}>Show</button>
              </span>
            {/each}
          </div>
        </div>
      {/if}
      {#if hiddenAssessmentsWithInfo.length > 0}
        <div class="visibility-section">
          <span class="visibility-label">Assessments:</span>
          <div class="visibility-chips">
            {#each hiddenAssessmentsWithInfo as assessment}
              <span class="visibility-chip">
                {assessment.title}
                <button class="visibility-unhide" onclick={() => unhideAssessment(assessment.id)}>Show</button>
              </span>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <div id="main-grid-content" class="bsplus-overview-animate bsplus-overview-delay-1">
    {#if board.filteredAssessments.length === 0}
      <div class="empty-state">
        <OverviewIcon name="clipboard-document-list" size={40} class="empty-icon" />
        <p>No assessments found matching your filters</p>
      </div>
    {:else}
      <div class="kanban-board">
        {#each board.columns as column}
          {#if board.statusGroups[column.key]?.length > 0}
            <div class="kanban-column-parent">
              <div class="kanban-column {column.className}">
                <div class="column-header">
                  <div class="column-title">
                  <span class="column-title-main">
                    <OverviewIcon
                      name={column.icon ?? STATUS_COLUMN_ICONS[column.key] ?? "queue-list"}
                      size={18}
                    />
                    {column.title}
                  </span>
                  <span class="column-count">{board.statusGroups[column.key].length}</span>
                </div>
                </div>
                <div class="column-cards" id="{column.key.toLowerCase()}-cards">
                  {#each board.statusGroups[column.key] as assessment}
                    {@const status = statusOf(assessment)}
                    {@const dueDateClass = getDueDateClass(assessment)}
                    {@const isCompleted = completedIds.includes(assessment.id)}
                    {@const color = data.colors[assessment.code] || "#6366f1"}
                    <div 
                      class="assessment-card"
                      data-subject={assessment.code}
                      data-status={status}
                      style="--subject-color: {color}"
                      onclick={(e) => handleCardClick(assessment, e)}
                      role="button"
                      tabindex="0"
                      onkeydown={(e) => e.key === 'Enter' && handleCardClick(assessment, e)}
                    >
                      <div class="card-labels">
                        {#if isEngage && assessment.studentName}
                          <span class="card-label label-student">{assessment.studentName}</span>
                        {/if}
                        <span class="card-label label-subject">{assessment.code}</span>
                        {#if assessment.submitted}
                          <span class="card-label label-submitted" style="background: #10b981; color: white;">Submitted</span>
                        {/if}
                        {#if isCompleted && status === "MARKS_RELEASED" && !assessmentHasGradeDisplay(assessment)}
                          <span class="card-label label-completed" style="background: #059669; color: white;">Completed</span>
                        {/if}
                      </div>

                      {#if status !== "MARKS_RELEASED" || isCompleted}
                        <div class="card-menu">
                          <button 
                            class="menu-button" 
                            data-assessment-id={assessment.id}
                            onclick={(e) => toggleMenu(assessment.id, e)}
                            aria-label="Open menu"
                          >
                            <OverviewIcon name="ellipsis-vertical" size={16} />
                          </button>
                          <div class="menu-dropdown" style="display: {openMenuId === assessment.id ? 'block' : 'none'};">
                            {#if status !== "MARKS_RELEASED"}
                              <button class="menu-item mark-completed" onclick={() => markAssessmentCompleted(assessment)}>
                                Mark as Completed
                              </button>
                            {:else if isCompleted}
                              <button class="menu-item mark-not-completed" onclick={() => unmarkAssessmentCompleted(assessment)}>
                                Mark as Not Complete
                              </button>
                            {/if}
                            <button class="menu-item menu-item-hide" onclick={() => hideAssessment(assessment)}>
                              Hide assessment
                            </button>
                            <button class="menu-item menu-item-hide" onclick={() => hideSubject(assessment.code)}>
                              Hide subject ({assessment.code})
                            </button>
                          </div>
                        </div>
                      {/if}

                      <h3 class="assessment-title">{assessment.title}</h3>

                      {#if !assessmentHasGradeDisplay(assessment) && !isCompleted}
                        <div class="assessment-meta">
                          <div class="due-date {dueDateClass}">
                            <OverviewIcon name="calendar-days" size={14} />
                            {formatDate(assessment.due || assessment.date || assessment.dueDate || "", assessment.submitted)}
                          </div>
                        </div>
                      {/if}

                      {#if assessmentHasGradeDisplay(assessment)}
                        {@const gradeLabel = getDisplayGrade(assessment, isLetterGradeMode())}
                        {@const barPercent = getThermoscorePercent(assessment) ?? 0}
                        <div class="card-footer">
                          <div class="Thermoscore__Thermoscore___WFpL3" style="--fill-colour: {color}">
                            <div style="width: {barPercent}%" class="Thermoscore__fill___ojxDI">
                              <div title={gradeLabel} class="Thermoscore__text___XSR_M">
                                {gradeLabel}
                              </div>
                            </div>
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>
