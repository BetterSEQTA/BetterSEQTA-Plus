<script lang="ts">
  import type { Assessment } from "./types";

  interface Props {
    data: Assessment[];
  }

  let { data }: Props = $props();

  let currentPage = $state(0);
  let itemsPerPage = $state(10);
  let sortColumn = $state<keyof Assessment | null>("due");
  let sortDirection = $state<"asc" | "desc">("desc");

  const sortedData = $derived.by(() => {
    const list = [...data];
    if (!sortColumn) return list;
    list.sort((a, b) => {
      const av = a[sortColumn!];
      const bv = b[sortColumn!];
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : 1;
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return list;
  });

  const pageCount = $derived(Math.max(1, Math.ceil(sortedData.length / itemsPerPage)));
  const pageData = $derived(
    sortedData.slice(
      currentPage * itemsPerPage,
      (currentPage + 1) * itemsPerPage,
    ),
  );

  function toggleSort(column: keyof Assessment) {
    if (sortColumn === column) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = column;
      sortDirection = "asc";
    }
    currentPage = 0;
  }

  function formatStatus(status: string) {
    return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function gradeDisplay(a: Assessment) {
    if (a.finalGrade !== undefined) {
      return a.letterGrade
        ? `${a.finalGrade}% (${a.letterGrade})`
        : `${a.finalGrade}%`;
    }
    return a.letterGrade ?? "—";
  }
</script>

<section class="bsplus-analytics-table-wrap">
  <header class="bsplus-analytics-table-header">
    <h2>Assessment history</h2>
  </header>

  <div class="bsplus-analytics-table-scroll">
    <table class="bsplus-analytics-table">
      <thead>
        <tr>
          {#each [
            ["title", "Title"],
            ["subject", "Subject"],
            ["due", "Due"],
            ["status", "Status"],
            ["finalGrade", "Grade"],
          ] as [col, label]}
            <th>
              <button type="button" onclick={() => toggleSort(col as keyof Assessment)}>
                {label}
                {#if sortColumn === col}
                  {sortDirection === "asc" ? " ↑" : " ↓"}
                {/if}
              </button>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each pageData as row (row.id)}
          <tr>
            <td class="cell-title" title={row.title}>{row.title}</td>
            <td>{row.subject}</td>
            <td style="white-space: nowrap">
              {new Date(row.due).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </td>
            <td>{formatStatus(row.status)}</td>
            <td>
              {#if row.finalGrade !== undefined}
                <span class="bsplus-analytics-grade-pill">{gradeDisplay(row)}</span>
              {:else}
                {gradeDisplay(row)}
              {/if}
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" style="text-align: center; padding: 2rem; color: var(--bsplus-analytics-muted)">
              No assessments match your filters
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <footer class="bsplus-analytics-table-footer">
    <label>
      Rows per page
      <select bind:value={itemsPerPage} onchange={() => (currentPage = 0)}>
        {#each [5, 10, 20, 50] as n}
          <option value={n}>{n}</option>
        {/each}
      </select>
    </label>
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <button
        type="button"
        class="bsplus-analytics-btn bsplus-analytics-btn-ghost"
        style="padding: 0.4rem 0.85rem; font-size: 0.8125rem;"
        disabled={currentPage === 0}
        onclick={() => currentPage--}
      >
        Previous
      </button>
      <span>Page {currentPage + 1} of {pageCount}</span>
      <button
        type="button"
        class="bsplus-analytics-btn bsplus-analytics-btn-ghost"
        style="padding: 0.4rem 0.85rem; font-size: 0.8125rem;"
        disabled={currentPage >= pageCount - 1}
        onclick={() => currentPage++}
      >
        Next
      </button>
    </div>
  </footer>
</section>
