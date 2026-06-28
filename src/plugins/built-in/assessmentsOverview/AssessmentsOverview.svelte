<script lang="ts">
  import {
    assessmentHasGradeDisplay,
    determineStatus,
    formatDate,
    getDisplayGrade,
    getThermoscorePercent,
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

  export let data: any;

  interface FilterOptions {
    subject: string;
    student: string;
    sortBy: "due" | "grade" | "subject" | "title" | "year";
  }

  const HIDDEN_ASSESSMENTS_KEY = "betterseqta-hidden-assessments";

  function isLetterGradeMode(): boolean {
    const allSettings = settingsState.getAll() as unknown as Record<
      string,
      { lettergrade?: boolean } | undefined
    >;
    return allSettings["plugin.assessments-average.settings"]?.lettergrade ?? false;
  }

  let currentFilters: FilterOptions = {
    subject: "all",
    student: "all",
    sortBy: "due",
  };

  const isEngage = isSeqtaEngageExperience();
  $: showStudentFilter = isEngage && (data?.students?.length ?? 0) > 1;

  let filteredAssessments: any[] = [];
  let statusGroups: Record<string, any[]> = {};
  let columns: {
    key: string;
    title: string;
    className: string;
    icon: OverviewIconName;
  }[] = [];

  function getAssessmentYear(a: any): number {
    const dateStr = a.due || a.date || a.dueDate || a.created;
    return dateStr ? new Date(dateStr).getFullYear() : 0;
  }

  function getAssessmentType(a: any): string {
    return (a.type || a.assessmentType || a.taskType || "Other").toString();
  }

  function getAssessmentGrade(a: any): string {
    return getDisplayGrade(a, isLetterGradeMode());
  }

  function getGroupKey(assessment: any): string {
    switch (currentFilters.sortBy) {
      case "due":
        return determineStatus(assessment);
      case "year":
        return String(getAssessmentYear(assessment) || "Unknown");
      case "subject":
        return assessment.code || "Unknown";
      case "grade":
        return getAssessmentGrade(assessment);
      case "title":
        const first = (assessment.title || "?")[0].toUpperCase();
        return /[A-Z0-9]/.test(first) ? first : "#";
      default:
        return determineStatus(assessment);
    }
  }

  function sortCompare(a: any, b: any): number {
    return new Date(a.due || a.date || 0).getTime() - new Date(b.due || b.date || 0).getTime();
  }

  const STATUS_COLUMNS: {
    key: string;
    title: string;
    className: string;
    icon: OverviewIconName;
  }[] = [
    { key: "UPCOMING", title: "Upcoming", className: "column-upcoming", icon: "calendar-days" },
    { key: "DUE_SOON", title: "Due Soon", className: "column-due-soon", icon: "clock" },
    { key: "OVERDUE", title: "Overdue", className: "column-overdue", icon: "exclamation-triangle" },
    { key: "SUBMITTED", title: "Submitted", className: "column-submitted", icon: "document-check" },
    { key: "MARKS_RELEASED", title: "Marked", className: "column-marked", icon: "check-circle" },
  ];

  function groupSortIcon(): OverviewIconName {
    return GROUP_SORT_ICONS[currentFilters.sortBy] ?? "queue-list";
  }

  function buildGroupsAndColumns() {
    if (!data?.assessments) return { filteredAssessments: [], statusGroups: {}, columns: [] };
    const subjectFilters = settingsState.subjectfilters || {};
    const hiddenAssessmentIds = new Set(
      (JSON.parse(localStorage.getItem(HIDDEN_ASSESSMENTS_KEY) || "[]")).map(String)
    );

    const filtered = data.assessments.filter((a: any) => {
      if (hiddenAssessmentIds.has(String(a.id))) return false;
      if (subjectFilters[a.code] === false) return false;
      if (currentFilters.subject !== "all" && a.code !== currentFilters.subject) {
        return false;
      }
      if (
        isEngage &&
        currentFilters.student !== "all" &&
        String(a.studentId) !== currentFilters.student
      ) {
        return false;
      }
      return true;
    });

    const groups: Record<string, any[]> = {};
    filtered.forEach((assessment) => {
      const key = getGroupKey(assessment);
      if (!groups[key]) groups[key] = [];
      groups[key].push(assessment);
    });

    Object.keys(groups).forEach((key) => {
      groups[key].sort(sortCompare);
    });

    let cols: { key: string; title: string; className: string; icon: OverviewIconName }[];
    if (currentFilters.sortBy === "due") {
      cols = STATUS_COLUMNS;
    } else {
      const keys = Object.keys(groups).filter((k) => groups[k]?.length > 0);
      const sortIcon = groupSortIcon();
      if (currentFilters.sortBy === "year") {
        cols = keys.sort((a, b) => Number(b) - Number(a)).map((k) => ({ key: k, title: k, className: "column-custom", icon: sortIcon }));
      } else if (currentFilters.sortBy === "subject") {
        const subjectTitles = new Map(data?.subjects?.map((s: any) => [s.code, `${s.code} - ${s.title}`]) || []);
        cols = keys.sort().map((k) => ({ key: k, title: subjectTitles.get(k) || k, className: "column-custom", icon: sortIcon }));
      } else {
        cols = keys.sort().map((k) => ({ key: k, title: k, className: "column-custom", icon: sortIcon }));
      }
    }

    return { filteredAssessments: filtered, statusGroups: groups, columns: cols };
  }

  $: if (data) {
    const _ = currentFilters.sortBy && currentFilters.subject;
    const result = buildGroupsAndColumns();
    filteredAssessments = result.filteredAssessments;
    statusGroups = result.statusGroups;
    columns = result.columns;
  }

  function updateAssessments() {
    const result = buildGroupsAndColumns();
    filteredAssessments = result.filteredAssessments;
    statusGroups = result.statusGroups;
    columns = result.columns;
  }

  function getDueDateClass(assessment: any): string {
    const status = determineStatus(assessment);
    switch (status) {
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
    const completedKey = "betterseqta-completed-assessments";
    const completed = JSON.parse(localStorage.getItem(completedKey) || "[]");

    if (!completed.includes(assessment.id)) {
      completed.push(assessment.id);
      localStorage.setItem(completedKey, JSON.stringify(completed));
      updateAssessments();
      checkForCelebration();
    }
  }

  function unmarkAssessmentCompleted(assessment: any) {
    const completedKey = "betterseqta-completed-assessments";
    const completed = JSON.parse(localStorage.getItem(completedKey) || "[]");

    const index = completed.indexOf(assessment.id);
    if (index > -1) {
      completed.splice(index, 1);
      localStorage.setItem(completedKey, JSON.stringify(completed));
      updateAssessments();
    }
  }

  function hideAssessment(assessment: any) {
    const hidden = JSON.parse(localStorage.getItem(HIDDEN_ASSESSMENTS_KEY) || "[]");
    const id = String(assessment.id);
    if (!hidden.includes(id)) {
      hidden.push(id);
      localStorage.setItem(HIDDEN_ASSESSMENTS_KEY, JSON.stringify(hidden));
      visibilityRefresh++;
      closeAllMenus();
      updateAssessments();
    }
  }

  function hideSubject(subjectCode: string) {
    const filters = { ...(settingsState.subjectfilters || {}) };
    filters[subjectCode] = false;
    settingsState.subjectfilters = filters;
    closeAllMenus();
    updateAssessments();
  }

  function unhideSubject(subjectCode: string) {
    const filters = { ...(settingsState.subjectfilters || {}) };
    filters[subjectCode] = true;
    settingsState.subjectfilters = filters;
    updateAssessments();
  }

  function unhideAssessment(assessmentId: string) {
    const hidden = JSON.parse(localStorage.getItem(HIDDEN_ASSESSMENTS_KEY) || "[]");
    const idStr = String(assessmentId);
    const filtered = hidden.filter((id: string) => id !== idStr);
    localStorage.setItem(HIDDEN_ASSESSMENTS_KEY, JSON.stringify(filtered));
    visibilityRefresh++;
    updateAssessments();
  }

  function initSubjectFilters() {
    const filters = settingsState.subjectfilters || {};
    let updated = false;
    data.subjects.forEach((s: any) => {
      if (!Object.prototype.hasOwnProperty.call(filters, s.code)) {
        filters[s.code] = true;
        updated = true;
      }
    });
    if (updated) {
      settingsState.subjectfilters = filters;
    }
  }

  function checkForCelebration() {
    const overdueCount = statusGroups.OVERDUE?.length || 0;
    const dueSoonCount = statusGroups.DUE_SOON?.length || 0;
    
    if (overdueCount === 0 && dueSoonCount === 0) {
      setTimeout(() => {
        try {
          const duration = 100;
          const end = Date.now() + duration;

          (function frame() {
            confetti({
              particleCount: 17,
              angle: 60,
              spread: 65,
              drift: 0.8,
              startVelocity: 40,
              scalar: 2,
              gravity: 2,
              decay: 0.97,
              ticks: 300,
              origin: { x: 0, y: 1 },
              disableForReducedMotion: true,
            });
            
            confetti({
              particleCount: 17,
              angle: 120,
              spread: 65,
              drift: -0.8,
              startVelocity: 40,
              scalar: 2,
              decay: 0.97,
              ticks: 300,
              gravity: 2,
              origin: { x: 1, y: 1 },
              disableForReducedMotion: true,
            });

            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          }());
        } catch (e) {
          console.log("Confetti celebration failed:", e);
        }
      }, 500);
    } else if (overdueCount === 0 || dueSoonCount === 0) {
      setTimeout(() => {
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            scalar: 0.9,
            disableForReducedMotion: true,
          });
        } catch (e) {
          console.log("Confetti celebration failed:", e);
        }
      }, 500);
    }
  }

  function isManuallyCompleted(assessmentId: string): boolean {
    const completedKey = "betterseqta-completed-assessments";
    const completed = JSON.parse(localStorage.getItem(completedKey) || "[]");
    return completed.includes(assessmentId);
  }

  function handleCardClick(assessment: any, event: Event) {
    if ((event.target as HTMLElement).closest(".card-menu")) {
      return;
    }

    if (isSeqtaEngageExperience()) {
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

  let openMenuId: string | null = null;
  let showVisibilityPanel = false;
  let visibilityRefresh = 0;

  $: hiddenSubjects = data?.subjects?.filter(
    (s: any) => (settingsState.subjectfilters || {})[s.code] === false
  ) || [];
  $: hiddenAssessmentIds = (() => {
    visibilityRefresh; // Dependency for reactivity
    return new Set((JSON.parse(localStorage.getItem(HIDDEN_ASSESSMENTS_KEY) || "[]")).map(String));
  })();
  $: hiddenAssessmentsWithInfo = data?.assessments?.filter(
    (a: any) => hiddenAssessmentIds.has(String(a.id))
  ) || [];
  $: hasHiddenItems = hiddenSubjects.length > 0 || hiddenAssessmentsWithInfo.length > 0;

  function toggleMenu(assessmentId: string, event: Event) {
    event.stopPropagation();
    openMenuId = openMenuId === assessmentId ? null : assessmentId;
  }

  function closeAllMenus() {
    openMenuId = null;
  }

  $: if (data) {
    initSubjectFilters();
    updateAssessments();
    void currentFilters.sortBy;
    void currentFilters.subject;
    void currentFilters.student;
  }

</script>

<svelte:window on:click={closeAllMenus} />

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
          on:click={() => (showVisibilityPanel = !showVisibilityPanel)}
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
                <button class="visibility-unhide" on:click={() => unhideSubject(subject.code)}>Show</button>
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
                <button class="visibility-unhide" on:click={() => unhideAssessment(assessment.id)}>Show</button>
              </span>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <div id="main-grid-content" class="bsplus-overview-animate bsplus-overview-delay-1">
    {#if filteredAssessments.length === 0}
      <div class="empty-state">
        <OverviewIcon name="clipboard-document-list" size={40} class="empty-icon" />
        <p>No assessments found matching your filters</p>
      </div>
    {:else}
      <div class="kanban-board">
        {#each columns as column}
          {#if statusGroups[column.key]?.length > 0}
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
                  <span class="column-count">{statusGroups[column.key].length}</span>
                </div>
                </div>
                <div class="column-cards" id="{column.key.toLowerCase()}-cards">
                  {#each statusGroups[column.key] as assessment}
                    {@const status = determineStatus(assessment)}
                    {@const dueDateClass = getDueDateClass(assessment)}
                    {@const isCompleted = isManuallyCompleted(assessment.id)}
                    {@const color = data.colors[assessment.code] || "#6366f1"}
                    <div 
                      class="assessment-card"
                      data-subject={assessment.code}
                      data-status={status}
                      style="--subject-color: {color}"
                      on:click={(e) => handleCardClick(assessment, e)}
                      role="button"
                      tabindex="0"
                      on:keydown={(e) => e.key === 'Enter' && handleCardClick(assessment, e)}
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
                            on:click={(e) => toggleMenu(assessment.id, e)}
                            aria-label="Open menu"
                          >
                            <OverviewIcon name="ellipsis-vertical" size={16} />
                          </button>
                          <div class="menu-dropdown" style="display: {openMenuId === assessment.id ? 'block' : 'none'};">
                            {#if status !== "MARKS_RELEASED"}
                              <button class="menu-item mark-completed" on:click={() => markAssessmentCompleted(assessment)}>
                                Mark as Completed
                              </button>
                            {:else if isCompleted}
                              <button class="menu-item mark-not-completed" on:click={() => unmarkAssessmentCompleted(assessment)}>
                                Mark as Not Complete
                              </button>
                            {/if}
                            <button class="menu-item menu-item-hide" on:click={() => hideAssessment(assessment)}>
                              Hide assessment
                            </button>
                            <button class="menu-item menu-item-hide" on:click={() => hideSubject(assessment.code)}>
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
