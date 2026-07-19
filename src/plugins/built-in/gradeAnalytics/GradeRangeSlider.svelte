<script lang="ts">
  import { onDestroy } from "svelte";

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

  let visual: [number, number] = $state([...value]);
  let animationFrame: number | null = null;
  onDestroy(() => {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  });

  const span = $derived(Math.max(max - min, 1));
  const minPercent = $derived(((visual[0] - min) / span) * 100);
  const maxPercent = $derived(((visual[1] - min) / span) * 100);

  const minZ = $derived(
    dragging === "min" ? 5 : dragging === "max" ? 2 : value[0] > (min + max) / 2 ? 4 : 3,
  );
  const maxZ = $derived(
    dragging === "max" ? 5 : dragging === "min" ? 2 : value[1] <= (min + max) / 2 ? 4 : 3,
  );

  function clamp(n: number) {
    return Math.min(max, Math.max(min, n));
  }

  function animateVisualTo(target: [number, number]) {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);

    const start: [number, number] = [...visual];
    const startTime = performance.now();
    const duration = 200;

    function frame(now: number) {
      // sine wave ease animation
      const t = Math.min(1, (now - startTime) / duration);
      const eased = Math.sin((t * Math.PI) / 2);

      visual = [
        start[0] + (target[0] - start[0]) * eased,
        start[1] + (target[1] - start[1]) * eased,
      ];
      
      if (t < 1) {
        animationFrame = requestAnimationFrame(frame);
      } else {
        visual = target;
        animationFrame = null;
      }
    }
    animationFrame = requestAnimationFrame(frame);
  }

  function onInput(e: Event, which: "min" | "max", animate: boolean) {
    const raw = clamp(Number((e.currentTarget as HTMLInputElement).value));
    
    let next: [number, number];

    if (animate) {
      next = which === "min"
        // if next[0] > next[1]: next[1] = next[0]
        ? [raw, Math.max(raw, value[1])]
        // if next[1] < next[0]: next[0] = next[1]
        : [Math.min(raw, value[0]), raw]; 
    } else {
      if (which === "min") {
      next = raw > value[1]
        ? [value[1], raw]
        : [raw, value[1]];
      } else {
      next = raw < value[0]
        ? [raw, value[0]]
        : [value[0], raw];
      }
    }

    value = next;

    if (animate) {
      animateVisualTo(next);
    } else {
      visual = next;
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
      value={visual[0]}
      oninput={(e) => onInput(e, "min", false)}
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
      value={visual[1]}
      oninput={(e) => onInput(e, "max", false)}
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

  <div class="bsplus-analytics-range-display" aria-live="polite">
    <span class="bsplus-analytics-range-input-wrap">
      <input
        type="number"
        class="bsplus-analytics-range-value"
        value={value[0]}
        oninput={(e) => onInput(e, "min", true)}
        placeholder={min}
        min={min}
        max={max}
        step={step}
      />
      <span class="bsplus-analytics-range-suffix">%</span>
    </span>
    <span class="bsplus-analytics-range-dash">–</span>
    <span class="bsplus-analytics-range-input-wrap">
      <input
        type="number"
        class="bsplus-analytics-range-value"
        value={value[1]}
        oninput={(e) => onInput(e, "max", true)}
        placeholder={max}
        min={min}
        max={max}
        step={step}
      />
      <span class="bsplus-analytics-range-suffix">%</span>
    </span>
  </div>
</div>

<style>
  .bsplus-grade-range-slider {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    width: 100%;
    min-width: 0;
  }

  .bsplus-grade-range-slider-track-wrap {
    position: relative;
    width: 100%;
    height: 1.5rem;
    display: flex;
    align-items: center;
  }

  .bsplus-analytics-range-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .bsplus-analytics-range-input-wrap {
    position: relative;
    display: inline-block;
  }

  .bsplus-analytics-range-suffix {
    position: absolute;
    right: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--bsplus-analytics-muted);
    font-size: 0.75rem;
    font-weight: 500;
    pointer-events: none;
    opacity: 0.6;
  }

  .bsplus-analytics-range-dash {
    color: var(--bsplus-analytics-muted);
    font-weight: 700;
    padding: 0 0.15rem;
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
