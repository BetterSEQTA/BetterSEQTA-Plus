import { determineStatus, formatDate, getGradeValue } from './utils';

interface FilterOptions {
  subject: string;
  sortBy: 'due' | 'grade' | 'subject' | 'title';
}

let currentFilters: FilterOptions = {
  subject: 'all',
  sortBy: 'due'
};

export function renderGrid(container: HTMLElement, data: any) {
  container.innerHTML = '';
  container.className = '';
  container.id = 'grid-view-container';
  
  const header = document.createElement('div');
  header.className = 'grid-view-header';
  header.innerHTML = `
    <h1 class="grid-view-title">Assessments</h1>
    <div class="grid-view-filters">
      <select class="filter-select" id="subject-filter">
        <option value="all">All Subjects</option>
        ${data.subjects.map((s: any) => `<option value="${s.code}">${s.code} - ${s.title}</option>`).join('')}
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
  
  const subjectFilter = header.querySelector('#subject-filter') as HTMLSelectElement;
  const sortFilter = header.querySelector('#sort-filter') as HTMLSelectElement;
  
  subjectFilter.addEventListener('change', () => {
    currentFilters.subject = subjectFilter.value;
    renderAssessments();
  });
  
  sortFilter.addEventListener('change', () => {
    currentFilters.sortBy = sortFilter.value as any;
    renderAssessments();
  });

  const mainContent = document.createElement('div');
  mainContent.id = 'main-grid-content';
  container.appendChild(mainContent);

  function renderAssessments() {
    const contentArea = container.querySelector('#main-grid-content') as HTMLElement;
    contentArea.innerHTML = '';

    // Filter assessments by subject
    let filteredAssessments = data.assessments.filter((a: any) => {
      const subjectMatch = currentFilters.subject === 'all' || a.code === currentFilters.subject;
      return subjectMatch;
    });

    // Sort assessments
    filteredAssessments.sort((a: any, b: any) => {
      switch (currentFilters.sortBy) {
        case 'due':
          return new Date(a.due).getTime() - new Date(b.due).getTime();
        case 'grade':
          const gradeA = getGradeValue(a);
          const gradeB = getGradeValue(b);
          if (gradeA === null && gradeB === null) return 0;
          if (gradeA === null) return 1;
          if (gradeB === null) return -1;
          return gradeB - gradeA;
        case 'subject':
          return a.code.localeCompare(b.code);
        case 'title':
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

  function renderKanbanBoard(container: HTMLElement, assessments: any[], data: any) {
    // Group assessments by status
    const statusGroups = {
      'UPCOMING': [] as any[],
      'DUE_SOON': [] as any[],
      'OVERDUE': [] as any[],
      'MARKS_RELEASED': [] as any[]
    };

    assessments.forEach(assessment => {
      const status = determineStatus(assessment);
      if (statusGroups[status as keyof typeof statusGroups]) {
        statusGroups[status as keyof typeof statusGroups].push(assessment);
      }
    });

    const board = document.createElement('div');
    board.className = 'kanban-board';

    const columns = [
      {
        key: 'UPCOMING',
        title: 'Upcoming',
        className: 'column-upcoming',
        icon: '📅'
      },
      {
        key: 'DUE_SOON',
        title: 'Due Soon',
        className: 'column-due-soon',
        icon: '⏰'
      },
      {
        key: 'OVERDUE',
        title: 'Overdue',
        className: 'column-overdue',
        icon: '🚨'
      },
      {
        key: 'MARKS_RELEASED',
        title: 'Marked',
        className: 'column-marked',
        icon: '✅'
      }
    ];

    columns.forEach(column => {
      const columnParentEl = document.createElement('div');
      columnParentEl.className = 'kanban-column-parent';

      const columnEl = document.createElement('div');
      columnEl.className = `kanban-column ${column.className}`;
      
      const assessmentList = statusGroups[column.key as keyof typeof statusGroups];
      
      columnEl.innerHTML = /* html */`
        <div class="column-header">
          <div class="column-title">
            ${column.icon} ${column.title}
            <span class="column-count">${assessmentList.length}</span>
          </div>
        </div>
        <div class="column-cards" id="${column.key.toLowerCase()}-cards"></div>
      `;

      const cardsContainer = columnEl.querySelector(`#${column.key.toLowerCase()}-cards`) as HTMLElement;
      
      if (assessmentList.length === 0) {
        cardsContainer.innerHTML = /* html */`
          <div class="empty-column">
            <div class="empty-icon">${column.icon}</div>
            <p>No ${column.title.toLowerCase()} assessments</p>
          </div>
        `;
      } else {
        assessmentList.forEach(assessment => {
          cardsContainer.appendChild(createKanbanCard(assessment, data.colors[assessment.code] || '#6366f1'));
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

    const card = document.createElement('div');
    card.className = 'assessment-card';
    card.dataset.subject = assessment.code;
    card.dataset.status = status;
    card.style.setProperty('--subject-color', color);

    card.innerHTML = `
      <div class="card-labels">
        <span class="card-label label-subject">${assessment.code}</span>
        ${assessment.submitted ? '<span class="card-label label-submitted" style="background: #10b981; color: white;">Submitted</span>' : ''}
      </div>
      <h3 class="assessment-title">${assessment.title}</h3>
      <div class="assessment-meta">
        <div class="due-date ${dueDateClass}">
          📅 ${formatDate(assessment.due)}
        </div>
      </div>
      ${assessment.results
        ? /* html */`
        <div class="card-footer">
          <div class="Thermoscore__Thermoscore___WFpL3" style="--fill-colour: ${color}">
            <div style="width: ${assessment.results.percentage}%" class="Thermoscore__fill___ojxDI">
              <div title="${assessment.results.percentage}%" class="Thermoscore__text___XSR_M">${assessment.results.percentage}%</div>
            </div>
          </div>
        </div>
        ` : ''
      }
    `;

    card.addEventListener('click', () => {
      window.location.hash = `#?page=/assessments/${assessment.programmeID}:${assessment.metaclassID}&item=${assessment.id}`;
    });

    return card;
  }


  function getDueDateClass(assessment: any): string {
    const status = determineStatus(assessment);
    switch (status) {
      case 'OVERDUE':
        return 'overdue';
      case 'DUE_SOON':
        return 'due-soon';
      case 'UPCOMING':
        return 'upcoming';
      default:
        return '';
    }
  }

  // Initial render
  renderAssessments();
}

export function renderSkeletonLoader(container: HTMLElement) {
  container.innerHTML = '';
  container.className = '';
  container.id = 'grid-view-container';
  
  // Create header with disabled filters
  const header = document.createElement('div');
  header.className = 'grid-view-header';
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

  const mainContent = document.createElement('div');
  mainContent.id = 'main-grid-content';
  container.appendChild(mainContent);

  const columns = [
    {
      key: 'UPCOMING',
      title: 'Upcoming',
      className: 'column-upcoming',
      icon: '📅',
      skeletonCount: 3
    },
    {
      key: 'DUE_SOON',
      title: 'Due Soon',
      className: 'column-due-soon',
      icon: '⏰',
      skeletonCount: 2
    },
    {
      key: 'OVERDUE',
      title: 'Overdue',
      className: 'column-overdue',
      icon: '🚨',
      skeletonCount: 1
    },
    {
      key: 'MARKS_RELEASED',
      title: 'Marked',
      className: 'column-marked',
      icon: '✅',
      skeletonCount: 4
    }
  ];

  const board = document.createElement('div');
  board.className = 'kanban-board';

  columns.forEach(column => {
    const columnParentEl = document.createElement('div');
    columnParentEl.className = 'kanban-column-parent';

    const columnEl = document.createElement('div');
    columnEl.className = `kanban-column ${column.className}`;
    
    columnEl.innerHTML = /* html */`
      <div class="column-header">
        <div class="column-title">
          ${column.icon} ${column.title}
          <span class="column-count">...</span>
        </div>
      </div>
      <div class="column-cards" id="${column.key.toLowerCase()}-cards"></div>
    `;

    const cardsContainer = columnEl.querySelector(`#${column.key.toLowerCase()}-cards`) as HTMLElement;
    
    for (let i = 0; i < column.skeletonCount; i++) {
      cardsContainer.appendChild(createSkeletonCard(column.key === 'MARKS_RELEASED'));
    }

    columnParentEl.appendChild(columnEl);
    board.appendChild(columnParentEl);
  });

  mainContent.appendChild(board);
}

function createSkeletonCard(footer: boolean = false): HTMLElement {
  const card = document.createElement('div');
  card.className = 'assessment-card';

  card.innerHTML = `
    <div class="skeleton-element skeleton-label"></div>
    <div class="skeleton-element skeleton-title"></div>
    <div class="skeleton-element skeleton-title-line2"></div>
    <div class="skeleton-element skeleton-meta"></div>
    ${footer ? /* html */`
    <div class="skeleton-footer">
      <div class="skeleton-element" style="height: 16px; width: 100%;"></div>
    </div>
    ` : ''}
  `;

  return card;
}

export function renderLoadingState(container: HTMLElement) {
  renderSkeletonLoader(container);
}

export function renderErrorState(container: HTMLElement, error: string) {
  container.innerHTML = /* html */`
    <div class="error-container">
      <p class="error-text">Failed to load assessments</p>
      <p style="color: #94a3b8; font-size: 0.875rem;">${error}</p>
    </div>
  `;
}