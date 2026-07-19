<script lang="ts">
  import OverviewIcon from "./OverviewIcon.svelte";
  import type { OverviewIconName } from "./icons";

  const columns: {
    key: string;
    title: string;
    className: string;
    icon: OverviewIconName;
    skeletonCount: number;
  }[] = [
    { key: "UPCOMING", title: "Upcoming", className: "column-upcoming", icon: "calendar-days", skeletonCount: 3 },
    { key: "DUE_SOON", title: "Due Soon", className: "column-due-soon", icon: "clock", skeletonCount: 2 },
    { key: "OVERDUE", title: "Overdue", className: "column-overdue", icon: "exclamation-triangle", skeletonCount: 1 },
    { key: "MARKS_RELEASED", title: "Marked", className: "column-marked", icon: "check-circle", skeletonCount: 4 },
  ];
</script>

<div class="bsplus-overview-page">
  <header class="grid-view-header bsplus-overview-animate">
    <div class="grid-view-header-text">
      <h1 class="grid-view-title">Assessments</h1>
      <p class="grid-view-subtitle">Loading your assessment overview…</p>
    </div>
    <div class="grid-view-filters bsplus-overview-toolbar">
      <select class="filter-select" disabled>
        <option value="all">Loading subjects...</option>
      </select>
      <select class="filter-select" disabled>
        <option value="due">Sort by Due Date</option>
      </select>
    </div>
  </header>

  <div id="main-grid-content" class="bsplus-overview-animate bsplus-overview-delay-1">
    <div class="kanban-board">
      {#each columns as column}
        <div class="kanban-column-parent">
          <div class="kanban-column {column.className}">
            <div class="column-header">
              <div class="column-title">
                <span class="column-title-main">
                  <OverviewIcon name={column.icon} size={18} />
                  {column.title}
                </span>
                <span class="column-count">…</span>
              </div>
            </div>
            <div class="column-cards" id="{column.key.toLowerCase()}-cards">
              {#each Array(column.skeletonCount) as _}
                <div class="assessment-card">
                  <div class="skeleton-element skeleton-label"></div>
                  <div class="skeleton-element skeleton-title"></div>
                  <div class="skeleton-element skeleton-title-line2"></div>
                  <div class="skeleton-element skeleton-meta"></div>
                  {#if column.key === "MARKS_RELEASED"}
                    <div class="skeleton-footer">
                      <div class="skeleton-element" style="height: 16px; width: 100%;"></div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
