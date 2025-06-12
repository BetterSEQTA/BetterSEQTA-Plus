<script lang="ts">
  import { determineStatus, formatDate, getGradeValue } from "./utils";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import confetti from "canvas-confetti";

  export let data: any;

  interface FilterOptions {
    subject: string;
    sortBy: "due" | "grade" | "subject" | "title";
  }

  function percentageToLetter(percentage: number): string {
    const letterMap: Record<number, string> = {
      100: "A+",
      95: "A",
      90: "A-",
      85: "B+",
      80: "B",
      75: "B-",
      70: "C+",
      65: "C",
      60: "C-",
      55: "D+",
      50: "D",
      45: "D-",
      40: "E+",
      35: "E",
      30: "E-",
      0: "F",
    };

    const rounded = Math.ceil(percentage / 5) * 5;
    return letterMap[rounded] || "F";
  }

  let currentFilters: FilterOptions = {
    subject: "all",
    sortBy: "due",
  };

  let filteredAssessments: any[] = [];
  let statusGroups: Record<string, any[]> = {};

  function updateAssessments() {
    filteredAssessments = data.assessments.filter((a: any) => {
      const subjectMatch =
        currentFilters.subject === "all" || a.code === currentFilters.subject;
      return subjectMatch;
    });

    filteredAssessments.sort((a: any, b: any) => {
      switch (currentFilters.sortBy) {
        case "due":
          return new Date(a.due).getTime() - new Date(b.due).getTime();
        case "grade":
          const gradeA = getGradeValue(a);
          const gradeB = getGradeValue(b);
          if (gradeA === null && gradeB === null) return 0;
          if (gradeA === null) return 1;
          if (gradeB === null) return -1;
          return gradeB - gradeA;
        case "subject":
          return a.code.localeCompare(b.code);
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    statusGroups = {
      UPCOMING: [],
      DUE_SOON: [],
      OVERDUE: [],
      SUBMITTED: [],
      MARKS_RELEASED: [],
    };

    filteredAssessments.forEach((assessment) => {
      const status = determineStatus(assessment);
      if (statusGroups[status]) {
        statusGroups[status].push(assessment);
      }
    });
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
    window.location.hash = `#?page=/assessments/${assessment.programmeID}:${assessment.metaclassID}&item=${assessment.id}`;
  }

  let openMenuId: string | null = null;

  function toggleMenu(assessmentId: string, event: Event) {
    event.stopPropagation();
    openMenuId = openMenuId === assessmentId ? null : assessmentId;
  }

  function closeAllMenus() {
    openMenuId = null;
  }

  $: {
    if (data) {
      updateAssessments();
    }
  }

  const columns = [
    {
      key: "UPCOMING",
      title: "Upcoming",
      className: "column-upcoming",
      icon: "📅",
    },
    {
      key: "DUE_SOON",
      title: "Due Soon",
      className: "column-due-soon",
      icon: "⏰",
    },
    {
      key: "OVERDUE",
      title: "Overdue",
      className: "column-overdue",
      icon: "🚨",
    },
    {
      key: "SUBMITTED",
      title: "Submitted",
      className: "column-submitted",
      icon: "📝",
    },
    {
      key: "MARKS_RELEASED",
      title: "Marked",
      className: "column-marked",
      icon: "✅",
    },
  ];
</script>

<svelte:window on:click={closeAllMenus} />

<div id="grid-view-container">
  <div class="grid-view-header">
    <h1 class="grid-view-title">Assessments</h1>
    <div class="grid-view-filters">
      <select class="filter-select" bind:value={currentFilters.subject}>
        <option value="all">All Subjects</option>
        {#each data.subjects as subject}
          <option value={subject.code}>{subject.code} - {subject.title}</option>
        {/each}
      </select>
      <select class="filter-select" bind:value={currentFilters.sortBy}>
        <option value="due">Sort by Due Date</option>
        <option value="grade">Sort by Grade</option>
        <option value="subject">Sort by Subject</option>
        <option value="title">Sort by Title</option>
      </select>
    </div>
  </div>

  <div id="main-grid-content">
    {#if filteredAssessments.length === 0}
      <div class="empty-state">
        <div class="empty-icon">📋</div>
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
                    {column.icon} {column.title}
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
                        <span class="card-label label-subject">{assessment.code}</span>
                        {#if assessment.submitted}
                          <span class="card-label label-submitted" style="background: #10b981; color: white;">Submitted</span>
                        {/if}
                        {#if isCompleted && status === "MARKS_RELEASED" && !assessment.results}
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
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="12" cy="5" r="2"/>
                              <circle cx="12" cy="12" r="2"/>
                              <circle cx="12" cy="19" r="2"/>
                            </svg>
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
                          </div>
                        </div>
                      {/if}

                      <h3 class="assessment-title">{assessment.title}</h3>

                      {#if !assessment.results && !isCompleted}
                        <div class="assessment-meta">
                          <div class="due-date {dueDateClass}">
                            📅 {formatDate(assessment.due, assessment.submitted)}
                          </div>
                        </div>
                      {/if}

                      {#if assessment.results}
                        <div class="card-footer">
                          <div class="Thermoscore__Thermoscore___WFpL3" style="--fill-colour: {color}">
                            <div style="width: {assessment.results.percentage}%" class="Thermoscore__fill___ojxDI">
                              <div title="{assessment.results.percentage}%" class="Thermoscore__text___XSR_M">
                                {(() => {
                                  const allSettings = settingsState.getAll() as unknown as any;
                                  const letterGradeSetting = allSettings["plugin.assessments-average.settings"]?.lettergrade;
                                  return letterGradeSetting 
                                    ? percentageToLetter(assessment.results.percentage)
                                    : `${assessment.results.percentage}%`;
                                })()}
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