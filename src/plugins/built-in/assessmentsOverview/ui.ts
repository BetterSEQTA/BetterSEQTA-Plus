import { determineStatus, formatDate, getGradeValue } from "./utils";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";

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

interface FilterOptions {
  subject: string;
  sortBy: "due" | "grade" | "subject" | "title";
}

let currentFilters: FilterOptions = {
  subject: "all",
  sortBy: "due",
};

export function renderGrid(container: HTMLElement, data: any) {
  container.innerHTML = "";
  container.className = "";
  container.id = "grid-view-container";

  const header = document.createElement("div");
  header.className = "grid-view-header";
  header.innerHTML = `
    <h1 class="grid-view-title">Assessments</h1>
    <div class="grid-view-filters">
      <select class="filter-select" id="subject-filter">
        <option value="all">All Subjects</option>
        ${data.subjects.map((s: any) => `<option value="${s.code}">${s.code} - ${s.title}</option>`).join("")}
      </select>
      <select class="filter-select" id="sort-filter">
        <option value="due">Sort by Due Date</option>
        <option value="grade">Sort by Grade</option>
        <option value="subject">Sort by Subject</option>
        <option value="title">Sort by Title</option>
      </select>
    </div>
  `;

  container.appendChild(header);

  const subjectFilter = header.querySelector(
    "#subject-filter",
  ) as HTMLSelectElement;
  const sortFilter = header.querySelector("#sort-filter") as HTMLSelectElement;

  subjectFilter.addEventListener("change", () => {
    currentFilters.subject = subjectFilter.value;
    renderAssessments();
  });

  sortFilter.addEventListener("change", () => {
    currentFilters.sortBy = sortFilter.value as any;
    renderAssessments();
  });

  const mainContent = document.createElement("div");
  mainContent.id = "main-grid-content";
  container.appendChild(mainContent);

  function renderAssessments() {
    const contentArea = container.querySelector(
      "#main-grid-content",
    ) as HTMLElement;
    contentArea.innerHTML = "";

    let filteredAssessments = data.assessments.filter((a: any) => {
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

    if (filteredAssessments.length === 0) {
      contentArea.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>No assessments found matching your filters</p>
        </div>
      `;
      return;
    }

    renderKanbanBoard(contentArea, filteredAssessments, data);
  }

  function renderKanbanBoard(
    container: HTMLElement,
    assessments: any[],
    data: any,
  ) {
    const statusGroups = {
      UPCOMING: [] as any[],
      DUE_SOON: [] as any[],
      OVERDUE: [] as any[],
      SUBMITTED: [] as any[],
      MARKS_RELEASED: [] as any[],
    };

    assessments.forEach((assessment) => {
      const status = determineStatus(assessment);
      if (statusGroups[status as keyof typeof statusGroups]) {
        statusGroups[status as keyof typeof statusGroups].push(assessment);
      }
    });

    const board = document.createElement("div");
    board.className = "kanban-board";

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

    columns.forEach((column) => {
      const assessmentList =
        statusGroups[column.key as keyof typeof statusGroups];

      if (column.key === "SUBMITTED" && assessmentList.length === 0) {
        return;
      }

      const columnParentEl = document.createElement("div");
      columnParentEl.className = "kanban-column-parent";

      const columnEl = document.createElement("div");
      columnEl.className = `kanban-column ${column.className}`;

      columnEl.innerHTML = `
        <div class="column-header">
          <div class="column-title">
            ${column.icon} ${column.title}
            <span class="column-count">${assessmentList.length}</span>
          </div>
        </div>
        <div class="column-cards" id="${column.key.toLowerCase()}-cards"></div>
      `;

      const cardsContainer = columnEl.querySelector(
        `#${column.key.toLowerCase()}-cards`,
      ) as HTMLElement;

      if (assessmentList.length === 0) {
        cardsContainer.innerHTML = `
          <div class="empty-column">
            <div class="empty-icon">${column.icon}</div>
            <p>No ${column.title.toLowerCase()} assessments</p>
          </div>
        `;
      } else {
        assessmentList.forEach((assessment) => {
          cardsContainer.appendChild(
            createKanbanCard(
              assessment,
              data.colors[assessment.code] || "#6366f1",
            ),
          );
        });
      }

      columnParentEl.appendChild(columnEl);
      board.appendChild(columnParentEl);
    });

    container.appendChild(board);
  }

  function createKanbanCard(assessment: any, color: string): HTMLElement {
    const status = determineStatus(assessment);
    const dueDateClass = getDueDateClass(assessment);

    const completedKey = "betterseqta-completed-assessments";
    const completed = JSON.parse(localStorage.getItem(completedKey) || "[]");
    const isManuallyCompleted = completed.includes(assessment.id);

    const card = document.createElement("div");
    card.className = "assessment-card";
    card.dataset.subject = assessment.code;
    card.dataset.status = status;
    card.style.setProperty("--subject-color", color);

    card.innerHTML = `
      <div class="card-labels">
        <span class="card-label label-subject">${assessment.code}</span>
        ${assessment.submitted ? '<span class="card-label label-submitted" style="background: #10b981; color: white;">Submitted</span>' : ""}
        ${isManuallyCompleted && status === "MARKS_RELEASED" && !assessment.results ? '<span class="card-label label-completed" style="background: #059669; color: white;">Completed</span>' : ""}
      </div>
      ${
        status !== "MARKS_RELEASED"
          ? `
      <div class="card-menu">
        <button class="menu-button" data-assessment-id="${assessment.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
        <div class="menu-dropdown" style="display: none;">
          <button class="menu-item mark-completed">Mark as Completed</button>
        </div>
      </div>
      `
          : isManuallyCompleted
            ? `
      <div class="card-menu">
        <button class="menu-button" data-assessment-id="${assessment.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
        <div class="menu-dropdown" style="display: none;">
          <button class="menu-item mark-not-completed">Mark as Not Complete</button>
        </div>
      </div>
      `
            : ""
      }
      <h3 class="assessment-title">${assessment.title}</h3>
      ${
        !assessment.results && !isManuallyCompleted
          ? `
      <div class="assessment-meta">
        <div class="due-date ${dueDateClass}">
          📅 ${formatDate(assessment.due, assessment.submitted)}
        </div>
      </div>
      `
          : ""
      }
      ${
        assessment.results
          ? `
        <div class="card-footer">
          <div class="Thermoscore__Thermoscore___WFpL3" style="--fill-colour: ${color}">
            <div style="width: ${assessment.results.percentage}%" class="Thermoscore__fill___ojxDI">
              <div title="${assessment.results.percentage}%" class="Thermoscore__text___XSR_M">
                ${(() => {
                  const allSettings = settingsState.getAll() as unknown as any;
                  const letterGradeSetting =
                    allSettings["plugin.assessments-average.settings"]
                      ?.lettergrade;
                  return letterGradeSetting
                    ? percentageToLetter(assessment.results.percentage)
                    : `${assessment.results.percentage}%`;
                })()}
              </div>
            </div>
          </div>
        </div>
        `
          : ""
      }
    `;

    card.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest(".card-menu")) {
        return;
      }
      window.location.hash = `#?page=/assessments/${assessment.programmeID}:${assessment.metaclassID}&item=${assessment.id}`;
    });

    if (status !== "MARKS_RELEASED" || isManuallyCompleted) {
      const menuButton = card.querySelector(
        ".menu-button",
      ) as HTMLButtonElement;
      const menuDropdown = card.querySelector(".menu-dropdown") as HTMLElement;
      const markCompletedBtn = card.querySelector(
        ".mark-completed",
      ) as HTMLButtonElement;
      const markNotCompletedBtn = card.querySelector(
        ".mark-not-completed",
      ) as HTMLButtonElement;

      menuButton?.addEventListener("click", (e) => {
        e.stopPropagation();

        document.querySelectorAll(".menu-dropdown").forEach((dropdown) => {
          if (dropdown !== menuDropdown) {
            (dropdown as HTMLElement).style.display = "none";
          }
        });

        menuDropdown.style.display =
          menuDropdown.style.display === "none" ? "block" : "none";
      });

      markCompletedBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        markAssessmentCompleted(assessment);
        menuDropdown.style.display = "none";
      });

      markNotCompletedBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        unmarkAssessmentCompleted(assessment);
        menuDropdown.style.display = "none";
      });

      document.addEventListener("click", (e) => {
        if (!card.contains(e.target as Node)) {
          menuDropdown.style.display = "none";
        }
      });
    }

    return card;
  }

  function markAssessmentCompleted(assessment: any) {
    const completedKey = "betterseqta-completed-assessments";
    const completed = JSON.parse(localStorage.getItem(completedKey) || "[]");

    if (!completed.includes(assessment.id)) {
      completed.push(assessment.id);
      localStorage.setItem(completedKey, JSON.stringify(completed));

      updateAssessmentCard(assessment);
    }
  }

  function unmarkAssessmentCompleted(assessment: any) {
    const completedKey = "betterseqta-completed-assessments";
    const completed = JSON.parse(localStorage.getItem(completedKey) || "[]");

    const index = completed.indexOf(assessment.id);
    if (index > -1) {
      completed.splice(index, 1);
      localStorage.setItem(completedKey, JSON.stringify(completed));

      updateAssessmentCard(assessment);
    }
  }

  function updateAssessmentCard(assessment: any) {
    const existingCard = document
      .querySelector(`[data-assessment-id="${assessment.id}"]`)
      ?.closest(".assessment-card") as HTMLElement;
    if (!existingCard) return;

    const newStatus = determineStatus(assessment);
    const completedKey = "betterseqta-completed-assessments";
    const completed = JSON.parse(localStorage.getItem(completedKey) || "[]");
    const isManuallyCompleted = completed.includes(assessment.id);

    const currentColumn = existingCard.closest(".column-cards") as HTMLElement;
    const currentColumnId = currentColumn?.id;
    const targetColumnId = `${newStatus.toLowerCase()}-cards`;

    if (currentColumnId !== targetColumnId) {
      const targetColumn = document.getElementById(targetColumnId);
      if (targetColumn) {
        existingCard.remove();

        const newCard = createKanbanCard(
          assessment,
          data.colors[assessment.code] || "#6366f1",
        );
        targetColumn.appendChild(newCard);

        updateColumnCounts();

        const emptyState = targetColumn.querySelector(".empty-column");
        if (emptyState) {
          emptyState.remove();
        }

        if (currentColumn && currentColumn.children.length === 0) {
          const columnKey = currentColumnId
            ?.replace("-cards", "")
            .toUpperCase();
          const columnInfo = getColumnInfo(columnKey);
          if (columnInfo) {
            currentColumn.innerHTML = `
              <div class="empty-column">
                <div class="empty-icon">${columnInfo.icon}</div>
                <p>No ${columnInfo.title.toLowerCase()} assessments</p>
              </div>
            `;
          }
        }
      }
    } else {
      const newCard = createKanbanCard(
        assessment,
        data.colors[assessment.code] || "#6366f1",
      );
      existingCard.replaceWith(newCard);
    }
  }

  function updateColumnCounts() {
    document.querySelectorAll(".column-count").forEach((countEl) => {
      const column = countEl.closest(".kanban-column");
      const cardsContainer = column?.querySelector(".column-cards");
      const cardCount =
        cardsContainer?.querySelectorAll(".assessment-card").length || 0;
      countEl.textContent = cardCount.toString();
    });
  }

  function getColumnInfo(columnKey: string | undefined) {
    const columns = {
      UPCOMING: { title: "Upcoming", icon: "📅" },
      DUE_SOON: { title: "Due Soon", icon: "⏰" },
      OVERDUE: { title: "Overdue", icon: "🚨" },
      SUBMITTED: { title: "Submitted", icon: "📝" },
      MARKS_RELEASED: { title: "Marked", icon: "✅" },
    };
    return columnKey ? columns[columnKey as keyof typeof columns] : null;
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

  renderAssessments();
}

export function renderSkeletonLoader(container: HTMLElement) {
  container.innerHTML = "";
  container.className = "";
  container.id = "grid-view-container";

  const header = document.createElement("div");
  header.className = "grid-view-header";
  header.innerHTML = `
    <h1 class="grid-view-title">Assessments</h1>
    <div class="grid-view-filters">
      <select class="filter-select" id="subject-filter" disabled>
        <option value="all">Loading subjects...</option>
      </select>
      <select class="filter-select" id="sort-filter" disabled>
        <option value="due">Sort by Due Date</option>
      </select>
    </div>
  `;

  container.appendChild(header);

  const mainContent = document.createElement("div");
  mainContent.id = "main-grid-content";
  container.appendChild(mainContent);

  const columns = [
    {
      key: "UPCOMING",
      title: "Upcoming",
      className: "column-upcoming",
      icon: "📅",
      skeletonCount: 3,
    },
    {
      key: "DUE_SOON",
      title: "Due Soon",
      className: "column-due-soon",
      icon: "⏰",
      skeletonCount: 2,
    },
    {
      key: "OVERDUE",
      title: "Overdue",
      className: "column-overdue",
      icon: "🚨",
      skeletonCount: 1,
    },
    {
      key: "MARKS_RELEASED",
      title: "Marked",
      className: "column-marked",
      icon: "✅",
      skeletonCount: 4,
    },
  ];

  const board = document.createElement("div");
  board.className = "kanban-board";

  columns.forEach((column) => {
    const columnParentEl = document.createElement("div");
    columnParentEl.className = "kanban-column-parent";

    const columnEl = document.createElement("div");
    columnEl.className = `kanban-column ${column.className}`;

    columnEl.innerHTML = `
      <div class="column-header">
        <div class="column-title">
          ${column.icon} ${column.title}
          <span class="column-count">...</span>
        </div>
      </div>
      <div class="column-cards" id="${column.key.toLowerCase()}-cards"></div>
    `;

    const cardsContainer = columnEl.querySelector(
      `#${column.key.toLowerCase()}-cards`,
    ) as HTMLElement;

    for (let i = 0; i < column.skeletonCount; i++) {
      cardsContainer.appendChild(
        createSkeletonCard(column.key === "MARKS_RELEASED"),
      );
    }

    columnParentEl.appendChild(columnEl);
    board.appendChild(columnParentEl);
  });

  mainContent.appendChild(board);
}

function createSkeletonCard(footer: boolean = false): HTMLElement {
  const card = document.createElement("div");
  card.className = "assessment-card";

  card.innerHTML = `
    <div class="skeleton-element skeleton-label"></div>
    <div class="skeleton-element skeleton-title"></div>
    <div class="skeleton-element skeleton-title-line2"></div>
    <div class="skeleton-element skeleton-meta"></div>
    ${
      footer
        ? `
    <div class="skeleton-footer">
      <div class="skeleton-element" style="height: 16px; width: 100%;"></div>
    </div>
    `
        : ""
    }
  `;

  return card;
}

export function renderLoadingState(container: HTMLElement) {
  renderSkeletonLoader(container);
}

export function renderErrorState(container: HTMLElement, error: string) {
  container.innerHTML = `
    <div class="error-container">
      <p class="error-text">Failed to load assessments</p>
      <p style="color: #94a3b8; font-size: 0.875rem;">${error}</p>
    </div>
  `;
}
