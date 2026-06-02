<script lang="ts">
  let {
    value = $bindable<[number, number]>([0, 100]),
    min = 0,
    max = 100,
    step = 1,
  } = $props<{
    value?: [number, number];
    min?: number;
    max?: number;
    step?: number;
  }>();

  let dragging: "min" | "max" | null = $state(null);

  const span = $derived(max - min || 1);
  const minPercent = $derived(((value[0] - min) / span) * 100);
  const maxPercent = $derived(((value[1] - min) / span) * 100);

  const minZ = $derived(
    dragging === "min" ? 5 : dragging === "max" ? 2 : value[0] > (min + max) / 2 ? 4 : 3,
  );
  const maxZ = $derived(
    dragging === "max" ? 5 : dragging === "min" ? 2 : value[1] <= (min + max) / 2 ? 4 : 3,
  );

  function onMinInput(e: Event) {
    const raw = Number((e.currentTarget as HTMLInputElement).value);
    if (raw > value[1]) {
      value = [value[1], raw];
    } else {
      value = [raw, value[1]];
    }
  }

  function onMaxInput(e: Event) {
    const raw = Number((e.currentTarget as HTMLInputElement).value);
    if (raw < value[0]) {
      value = [raw, value[0]];
    } else {
      value = [value[0], raw];
    }
  }
</script>

<div class="bsplus-grade-range-slider">
  <div class="bsplus-grade-range-slider-track-wrap">
    <div class="bsplus-grade-range-slider-track" aria-hidden="true">
      <div class="bsplus-grade-range-slider-rail"></div>
      <div
        class="bsplus-grade-range-slider-fill"
        style:left="{minPercent}%"
        style:width="{maxPercent - minPercent}%"
      ></div>
    </div>
    <input
      type="range"
      class="bsplus-grade-range-slider-input"
      {min}
      {max}
      {step}
      value={value[0]}
      oninput={onMinInput}
      onpointerdown={() => (dragging = "min")}
      onpointerup={() => (dragging = null)}
      onpointercancel={() => (dragging = null)}
      onblur={() => {
        if (dragging === "min") dragging = null;
      }}
      style:z-index={minZ}
      aria-label="Minimum grade"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value[0]}
    />
    <input
      type="range"
      class="bsplus-grade-range-slider-input"
      {min}
      {max}
      {step}
      value={value[1]}
      oninput={onMaxInput}
      onpointerdown={() => (dragging = "max")}
      onpointerup={() => (dragging = null)}
      onpointercancel={() => (dragging = null)}
      onblur={() => {
        if (dragging === "max") dragging = null;
      }}
      style:z-index={maxZ}
      aria-label="Maximum grade"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value[1]}
    />
  </div>
  <span class="bsplus-analytics-range-value" aria-live="polite">
    {value[0]}% – {value[1]}%
  </span>
</div>

<style>
  .bsplus-grade-range-slider {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    width: 100%;
    min-width: 0;
  }

  .bsplus-grade-range-slider-track-wrap {
    position: relative;
    flex: 1;
    height: 1.5rem;
    display: flex;
    align-items: center;
  }

  .bsplus-grade-range-slider-track {
    position: absolute;
    left: 0;
    right: 0;
    height: 0.35rem;
    pointer-events: none;
  }

  .bsplus-grade-range-slider-rail {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--bsplus-analytics-muted) 28%, transparent);
  }

  .bsplus-grade-range-slider-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: 999px;
    background: var(--bsplus-analytics-accent);
  }

  .bsplus-grade-range-slider-input {
    position: absolute;
    left: 0;
    width: 100%;
    margin: 0;
    height: 1.5rem;
    background: transparent;
    pointer-events: none;
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
  }

  .bsplus-grade-range-slider-input::-webkit-slider-runnable-track {
    -webkit-appearance: none;
    height: 0.35rem;
    background: transparent;
    border: none;
  }

  .bsplus-grade-range-slider-input::-moz-range-track {
    height: 0.35rem;
    background: transparent;
    border: none;
  }

  .bsplus-grade-range-slider-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    pointer-events: all;
    width: 1rem;
    height: 1rem;
    margin-top: -0.325rem;
    border-radius: 50%;
    border: 2px solid var(--bsplus-analytics-accent);
    background: var(--bsplus-analytics-surface, #fff);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
    cursor: grab;
    transition:
      transform 0.12s var(--bsplus-analytics-ease, ease),
      box-shadow 0.12s var(--bsplus-analytics-ease, ease);
  }

  .bsplus-grade-range-slider-input:active::-webkit-slider-thumb {
    cursor: grabbing;
    transform: scale(1.08);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
  }

  .bsplus-grade-range-slider-input::-moz-range-thumb {
    pointer-events: all;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    border: 2px solid var(--bsplus-analytics-accent);
    background: var(--bsplus-analytics-surface, #fff);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
    cursor: grab;
  }

  .bsplus-grade-range-slider-input:active::-moz-range-thumb {
    cursor: grabbing;
    transform: scale(1.08);
  }

  .bsplus-grade-range-slider :global(.bsplus-analytics-range-value) {
    flex-shrink: 0;
  }
</style>
