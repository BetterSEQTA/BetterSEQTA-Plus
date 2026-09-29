<script lang="ts">
  import {
    createGradeBand,
    DEFAULT_ANALYTICS_GRADE_INFERENCE,
    type AnalyticsGradeInferenceSettings,
    type GradeBandMapping,
  } from "./gradeInferenceSettings";

  type Props = {
    settings: AnalyticsGradeInferenceSettings;
    onSave: (settings: AnalyticsGradeInferenceSettings) => void | Promise<void>;
    disabled?: boolean;
  };

  let { settings, onSave, disabled = false }: Props = $props();

  let expanded = $state(false);
  let draft = $state<AnalyticsGradeInferenceSettings>(
    structuredClone(DEFAULT_ANALYTICS_GRADE_INFERENCE),
  );
  let saving = $state(false);

  $effect(() => {
    draft = structuredClone(settings);
  });

  function updateDraft(patch: Partial<AnalyticsGradeInferenceSettings>) {
    draft = { ...draft, ...patch };
  }

  function updateBand(id: string, patch: Partial<GradeBandMapping>) {
    draft = {
      ...draft,
      gradeBands: draft.gradeBands.map((band) =>
        band.id === id ? { ...band, ...patch } : band,
      ),
    };
  }

  function removeBand(id: string) {
    draft = {
      ...draft,
      gradeBands: draft.gradeBands.filter((band) => band.id !== id),
    };
  }

  function addBand() {
    draft = {
      ...draft,
      gradeBands: [...draft.gradeBands, createGradeBand("", 75)],
    };
  }

  async function save() {
    saving = true;
    try {
      const cleaned: AnalyticsGradeInferenceSettings = {
        useCustomGradeBands: draft.useCustomGradeBands,
        rollupCriteriaGrades: draft.rollupCriteriaGrades,
        gradeBands: draft.gradeBands
          .map((band) => ({
            ...band,
            label: band.label.trim(),
            percent: Math.min(100, Math.max(0, Number(band.percent) || 0)),
          }))
          .filter((band) => band.label.length > 0),
      };
      await onSave(cleaned);
    } finally {
      saving = false;
    }
  }

  const dirty = $derived(JSON.stringify(draft) !== JSON.stringify(settings));
</script>

<div class="bsplus-analytics-filter-group bsplus-analytics-grade-inference">
  <button
    type="button"
    class="bsplus-analytics-grade-inference-toggle"
    aria-expanded={expanded}
    onclick={() => (expanded = !expanded)}
  >
    <span class="bsplus-analytics-field-label">Grade inference (optional)</span>
    <span class="bsplus-analytics-grade-inference-chevron" aria-hidden="true"
      >{expanded ? "▾" : "▸"}</span
    >
  </button>

  {#if expanded}
    <p class="bsplus-analytics-grade-inference-desc">
      Analytics works without these options. Turn them on if teachers use rubrics without an overall
      percentage, or if sub-parts of an assessment are marked separately.
    </p>

    <label class="bsplus-analytics-grade-inference-option">
      <input
        type="checkbox"
        checked={draft.useCustomGradeBands}
        disabled={disabled || saving}
        onchange={(e) =>
          updateDraft({ useCustomGradeBands: e.currentTarget.checked })}
      />
      <span>Map rubric / letter bands to percentages</span>
    </label>

    {#if draft.useCustomGradeBands}
      <div class="bsplus-analytics-grade-bands">
        {#each draft.gradeBands as band (band.id)}
          <div class="bsplus-analytics-grade-band-row">
            <input
              type="text"
              class="bsplus-analytics-input"
              placeholder="Band label (e.g. A, Proficient)"
              value={band.label}
              disabled={disabled || saving}
              oninput={(e) =>
                updateBand(band.id, { label: e.currentTarget.value })}
            />
            <input
              type="number"
              class="bsplus-analytics-input bsplus-analytics-grade-band-percent"
              min="0"
              max="100"
              step="1"
              value={band.percent}
              disabled={disabled || saving}
              oninput={(e) =>
                updateBand(band.id, { percent: Number(e.currentTarget.value) })}
            />
            <span class="bsplus-analytics-grade-band-suffix">%</span>
            <button
              type="button"
              class="bsplus-analytics-class-group-icon bsplus-analytics-class-group-delete"
              aria-label="Remove band"
              disabled={disabled || saving}
              onclick={() => removeBand(band.id)}
            >
              ×
            </button>
          </div>
        {/each}
        <button
          type="button"
          class="bsplus-analytics-btn"
          disabled={disabled || saving}
          onclick={addBand}
        >
          Add band
        </button>
      </div>
    {/if}

    <label class="bsplus-analytics-grade-inference-option">
      <input
        type="checkbox"
        checked={draft.rollupCriteriaGrades}
        disabled={disabled || saving}
        onchange={(e) =>
          updateDraft({ rollupCriteriaGrades: e.currentTarget.checked })}
      />
      <span>Estimate overall % from marked criteria (sub-assessments)</span>
    </label>

    <button
      type="button"
      class="bsplus-analytics-btn bsplus-analytics-btn-primary bsplus-analytics-grade-inference-save"
      disabled={disabled || saving || !dirty}
      onclick={() => void save()}
    >
      {saving ? "Saving…" : "Save & refresh grades"}
    </button>
  {/if}
</div>

<style>
  .bsplus-analytics-grade-inference-toggle {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    text-align: left;
  }

  .bsplus-analytics-grade-inference-chevron {
    opacity: 0.6;
    font-size: 0.85rem;
  }

  .bsplus-analytics-grade-inference-desc {
    margin: 0.5rem 0 0.75rem;
    font-size: 0.8125rem;
    line-height: 1.45;
    opacity: 0.85;
  }

  .bsplus-analytics-grade-inference-option {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.65rem;
    font-size: 0.875rem;
    line-height: 1.35;
    cursor: pointer;
  }

  .bsplus-analytics-grade-bands {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0 0 0.75rem 1.25rem;
  }

  .bsplus-analytics-grade-band-row {
    display: grid;
    grid-template-columns: 1fr 4.5rem auto auto;
    gap: 0.35rem;
    align-items: center;
  }

  .bsplus-analytics-grade-band-percent {
    text-align: right;
  }

  .bsplus-analytics-grade-band-suffix {
    font-size: 0.875rem;
    opacity: 0.7;
  }

  .bsplus-analytics-grade-inference-save {
    margin-top: 0.25rem;
    width: 100%;
  }
</style>
