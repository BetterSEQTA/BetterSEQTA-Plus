<script lang="ts">
  let {
    value = $bindable(3),
    min = 1,
    max = 12,
    step = 1,
    disabled = false,
  } = $props<{
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
  }>();

  const percent = $derived(((value - min) / (max - min || 1)) * 100);
</script>

<div class="bsplus-prediction-months-slider" class:is-disabled={disabled}>
  <div class="bsplus-prediction-months-slider-track-wrap">
    <div class="bsplus-prediction-months-slider-track" aria-hidden="true">
      <div class="bsplus-prediction-months-slider-rail"></div>
      <div class="bsplus-prediction-months-slider-fill" style:width="{percent}%"></div>
    </div>
    <input
      type="range"
      class="bsplus-prediction-months-slider-input"
      {min}
      {max}
      {step}
      {disabled}
      bind:value
      aria-label="Forecast months ahead"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
    />
  </div>
  <span class="bsplus-analytics-range-value" aria-live="polite">
    {value} month{value === 1 ? "" : "s"}
  </span>
</div>

<style>
  .bsplus-prediction-months-slider {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    width: 100%;
    min-width: 0;
  }

  .bsplus-prediction-months-slider.is-disabled {
    opacity: 0.45;
    pointer-events: none;
  }

  .bsplus-prediction-months-slider-track-wrap {
    position: relative;
    flex: 1;
    height: 1.5rem;
    display: flex;
    align-items: center;
  }

  .bsplus-prediction-months-slider-track {
    position: absolute;
    left: 0;
    right: 0;
    height: 0.35rem;
    pointer-events: none;
  }

  .bsplus-prediction-months-slider-rail {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--bsplus-analytics-muted) 28%, transparent);
  }

  .bsplus-prediction-months-slider-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    border-radius: 999px;
    background: var(--bsplus-analytics-accent);
  }

  .bsplus-prediction-months-slider-input {
    position: absolute;
    left: 0;
    width: 100%;
    margin: 0;
    height: 1.5rem;
    background: transparent;
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
  }

  .bsplus-prediction-months-slider-input::-webkit-slider-runnable-track {
    -webkit-appearance: none;
    height: 0.35rem;
    background: transparent;
    border: none;
  }

  .bsplus-prediction-months-slider-input::-moz-range-track {
    height: 0.35rem;
    background: transparent;
    border: none;
  }

  .bsplus-prediction-months-slider-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 1rem;
    height: 1rem;
    margin-top: -0.325rem;
    border-radius: 50%;
    border: 2px solid var(--bsplus-analytics-accent);
    background: var(--bsplus-analytics-surface, #fff);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
    cursor: grab;
  }

  .bsplus-prediction-months-slider-input::-moz-range-thumb {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    border: 2px solid var(--bsplus-analytics-accent);
    background: var(--bsplus-analytics-surface, #fff);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
    cursor: grab;
  }
</style>
