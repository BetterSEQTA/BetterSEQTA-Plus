<div id="grid-view-container">
  <div class="grid-view-header">
    <h1 class="grid-view-title">Assessments</h1>
    <div class="grid-view-filters">
      <select class="filter-select" disabled>
        <option value="all">Loading subjects...</option>
      </select>
      <select class="filter-select" disabled>
        <option value="due">Sort by Due Date</option>
      </select>
    </div>
  </div>

  <div id="main-grid-content">
    <div class="kanban-board">
      {#each columns as column}
        <div class="kanban-column-parent">
          <div class="kanban-column {column.className}">
            <div class="column-header">
              <div class="column-title">
                {column.icon} {column.title}
                <span class="column-count">...</span>
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

<script lang="ts">
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
</script>