<script lang="ts">
  import PipetteIcon from "@lucide/svelte/icons/pipette";
  import TrashIcon from "@lucide/svelte/icons/trash";
  import { untrack } from "svelte";
  import { slide } from "svelte/transition";
  import {
    clamp,
    colourAt,
    formatColour,
    formatStops,
    formatValue,
    hsvaToRgba,
    parseColour,
    parseValue,
    rgbaToHex,
    rgbaToHsva,
    type ColourValue,
    type GradientStop,
    type Hsva,
    type Rgba,
  } from "./colourValue";

  type EyeDropperApi = { open: () => Promise<{ sRGBHex: string }> };

  let {
    value,
    onchange,
    presets = [],
  }: {
    value: string;
    onchange: (value: string) => void;
    presets?: string[];
  } = $props();

  const MODES = [
    { kind: "solid", label: "Solid" },
    { kind: "linear", label: "Linear" },
    { kind: "radial", label: "Radial" },
  ] as const;
  const CHECKERBOARD = "repeating-conic-gradient(#d4d4d8 0% 25%, #ffffff 0% 50%) 50% / 8px 8px";
  const EyeDropper = (globalThis as { EyeDropper?: new () => EyeDropperApi }).EyeDropper;

  const initial = untrack(() => parseValue(value));
  let model = $state<ColourValue>(initial);
  let selected = $state(0);
  let hsva = $state<Hsva>(rgbaToHsva(colourOf(initial, 0)));
  let lastAngle = initial.kind === "linear" ? initial.angle : 90;
  let lastEmitted = untrack(() => value);
  let area = $state<HTMLDivElement>();
  let bar = $state<HTMLDivElement>();
  let dragging = $state<number | null>(null);

  const active = $derived(colourOf(model, selected));
  const hex = $derived(rgbaToHex(active));
  const stops = $derived(model.kind === "solid" ? [] : model.stops);
  const shownPresets = $derived([...new Set(presets)].slice(0, 18));
  const modeIndex = $derived(MODES.findIndex((mode) => mode.kind === model.kind));

  $effect(() => {
    if (value === lastEmitted) return;
    lastEmitted = value;
    load(parseValue(value));
  });

  function asLayer(css: string): string {
    return /gradient\(/i.test(css) ? css : `linear-gradient(${css}, ${css})`;
  }

  function colourOf(m: ColourValue, index: number): Rgba {
    return m.kind === "solid" ? m.colour : m.stops[Math.min(index, m.stops.length - 1)].colour;
  }

  function load(next: ColourValue) {
    if (next.kind === "linear") lastAngle = next.angle;
    model = next;
    selected = 0;
    hsva = rgbaToHsva(colourOf(next, 0));
  }

  function commit(next: ColourValue) {
    model = next;
    lastEmitted = formatValue(next);
    onchange(lastEmitted);
  }

  function snapshot(): ColourValue {
    return $state.snapshot(model) as ColourValue;
  }

  function withStops(
    m: ColourValue,
    update: (stops: GradientStop[]) => GradientStop[],
  ): ColourValue {
    return m.kind === "solid" ? m : { ...m, stops: update(m.stops) };
  }

  function setActiveColour(colour: Rgba) {
    const m = snapshot();
    commit(
      m.kind === "solid"
        ? { kind: "solid", colour }
        : withStops(m, (all) =>
            all.map((stop, i) => (i === selected ? { ...stop, colour } : stop)),
          ),
    );
  }

  function updateHsva(next: Partial<Hsva>) {
    hsva = { ...hsva, ...next };
    setActiveColour(hsvaToRgba(hsva));
  }

  function setRgba(colour: Rgba) {
    hsva = rgbaToHsva(colour);
    setActiveColour(colour);
  }

  function selectStop(index: number) {
    selected = index;
    hsva = rgbaToHsva(colourOf(model, index));
  }

  function setMode(kind: ColourValue["kind"]) {
    const m = snapshot();
    if (m.kind === kind) return;
    const colour = colourOf(m, selected);
    const base = rgbaToHsva(colour);
    const gradientStops =
      m.kind === "solid"
        ? [
            { colour, position: 0 },
            { colour: hsvaToRgba({ ...base, h: (base.h + 60) % 360 }), position: 100 },
          ]
        : m.stops;
    const next: ColourValue =
      kind === "solid"
        ? { kind, colour }
        : kind === "linear"
          ? { kind, angle: lastAngle, stops: gradientStops }
          : { kind, stops: gradientStops };
    load(next);
    commit(next);
  }

  function pickArea(event: PointerEvent) {
    const rect = area!.getBoundingClientRect();
    updateHsva({
      s: clamp((event.clientX - rect.left) / rect.width, 0, 1) * 100,
      v: (1 - clamp((event.clientY - rect.top) / rect.height, 0, 1)) * 100,
    });
  }

  function areaKeys(event: KeyboardEvent) {
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, Partial<Hsva>> = {
      ArrowLeft: { s: clamp(hsva.s - step, 0, 100) },
      ArrowRight: { s: clamp(hsva.s + step, 0, 100) },
      ArrowDown: { v: clamp(hsva.v - step, 0, 100) },
      ArrowUp: { v: clamp(hsva.v + step, 0, 100) },
    };
    if (!moves[event.key]) return;
    event.preventDefault();
    updateHsva(moves[event.key]);
  }

  function barPosition(event: PointerEvent): number {
    const rect = bar!.getBoundingClientRect();
    return Math.round(clamp((event.clientX - rect.left) / rect.width, 0, 1) * 100);
  }

  function moveStop(index: number, position: number) {
    commit(
      withStops(snapshot(), (all) =>
        all.map((stop, i) => (i === index ? { ...stop, position } : stop)),
      ),
    );
  }

  function startStopDrag(event: PointerEvent, index: number) {
    event.stopPropagation();
    selectStop(index);
    bar!.setPointerCapture(event.pointerId);
    dragging = index;
  }

  function addStop(event: PointerEvent) {
    const m = snapshot();
    if (m.kind === "solid") return;
    const position = barPosition(event);
    const colour = colourAt(m.stops, position);
    commit(withStops(m, (all) => [...all, { colour, position }]));
    selectStop(m.stops.length);
    bar!.setPointerCapture(event.pointerId);
    dragging = m.stops.length;
  }

  function removeStop(index: number) {
    const m = snapshot();
    if (m.kind === "solid" || m.stops.length <= 2) return;
    commit(withStops(m, (all) => all.filter((_, i) => i !== index)));
    selectStop(Math.min(selected, m.stops.length - 2));
  }

  function stopKeys(event: KeyboardEvent, index: number) {
    const step = event.shiftKey ? 10 : 1;
    const position = stops[index].position;
    if (event.key === "ArrowLeft") moveStop(index, clamp(position - step, 0, 100));
    else if (event.key === "ArrowRight") moveStop(index, clamp(position + step, 0, 100));
    else if (event.key === "Delete" || event.key === "Backspace") removeStop(index);
    else return;
    event.preventDefault();
  }

  function setAngle(angle: number) {
    const m = snapshot();
    if (m.kind !== "linear") return;
    lastAngle = clamp(Math.round(angle), 0, 360);
    commit({ ...m, angle: lastAngle });
  }

  function setHex(input: string, final = false) {
    const digits = input.trim().replace(/^#/, "");
    const complete = /^[0-9a-f]{6}$/i.test(digits) || (final && /^[0-9a-f]{3}$/i.test(digits));
    const parsed = complete ? parseColour(`#${digits}`) : null;
    if (parsed) setRgba({ ...parsed, a: active.a });
  }

  async function pickFromScreen() {
    if (!EyeDropper) return;
    try {
      const { sRGBHex } = await new EyeDropper().open();
      const parsed = parseColour(sRGBHex);
      if (parsed) setRgba({ ...parsed, a: active.a });
    } catch {
      return;
    }
  }

  function applyPreset(preset: string) {
    const next = parseValue(preset);
    load(next);
    commit(next);
  }
</script>

<div class="flex flex-col gap-3 w-72 max-w-full text-zinc-900 select-none dark:text-white">
  <div>
    <div
      class="grid relative grid-cols-3 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-700/70"
      role="radiogroup"
      aria-label="Fill type"
    >
      <div
        class="absolute left-0.5 inset-y-0.5 w-[calc((100%-0.25rem)/3)] rounded-md bg-white shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none dark:bg-zinc-600"
        style="transform: translateX({modeIndex * 100}%);"
        aria-hidden="true"
      ></div>
      {#each MODES as mode (mode.kind)}
        <button
          type="button"
          role="radio"
          aria-checked={model.kind === mode.kind}
          class="relative py-1 text-xs font-medium rounded-md transition-colors duration-200 {model.kind ===
          mode.kind
            ? 'text-zinc-900 dark:text-white'
            : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'}"
          onclick={() => setMode(mode.kind)}
        >
          {mode.label}
        </button>
      {/each}
    </div>

    {#if model.kind !== "solid"}
      <div class="flex gap-2 items-center pt-3" transition:slide={{ duration: 180 }}>
        <div
          class="flex-1 px-2.5 py-1.5 cursor-copy touch-none"
          role="group"
          aria-label="Gradient stops"
          onpointerdown={addStop}
          onpointermove={(event) => {
            if (dragging !== null) moveStop(dragging, barPosition(event));
          }}
          onpointerup={() => (dragging = null)}
          onpointercancel={() => (dragging = null)}
        >
          <div
            bind:this={bar}
            class="relative h-3 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10"
            style="background: linear-gradient(to right, {formatStops(stops)}), {CHECKERBOARD};"
          >
            {#each stops as stop, index (index)}
              <button
                type="button"
                class="absolute top-1/2 handle cursor-grab active:cursor-grabbing {index ===
                selected
                  ? 'handle-selected'
                  : ''}"
                style="left: {stop.position}%; --swatch: {formatColour(stop.colour)};"
                aria-label="Colour stop at {Math.round(stop.position)}%"
                aria-pressed={index === selected}
                onpointerdown={(event) => startStopDrag(event, index)}
                onkeydown={(event) => stopKeys(event, index)}
              ></button>
            {/each}
          </div>
        </div>
        {#if model.kind === "linear"}
          <label
            class="flex shrink-0 items-center px-2 w-14 h-7 text-xs rounded-md bg-zinc-100 dark:bg-zinc-700/70"
          >
            <input
              type="number"
              min="0"
              max="360"
              class="p-0 w-full min-w-0 text-xs text-right bg-transparent border-0 outline-none select-text picker-number"
              aria-label="Gradient angle in degrees"
              value={model.angle}
              oninput={(event) => {
                if (event.currentTarget.value !== "") setAngle(Number(event.currentTarget.value));
              }}
            />
            <span class="text-zinc-500 dark:text-zinc-400">°</span>
          </label>
        {/if}
        <button
          type="button"
          class="grid shrink-0 place-items-center rounded-md transition size-7 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 disabled:pointer-events-none dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
          aria-label="Remove selected stop"
          disabled={stops.length <= 2}
          onclick={() => removeStop(selected)}
        >
          <TrashIcon class="size-4" />
        </button>
      </div>
    {/if}
  </div>

  <div
    bind:this={area}
    class="relative h-40 rounded-lg cursor-crosshair touch-none outline-none ring-1 ring-inset ring-black/10 dark:ring-white/10"
    style="background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl({hsva.h} 100% 50%));"
    role="slider"
    tabindex="0"
    aria-label="Saturation and brightness"
    aria-valuenow={Math.round(hsva.s)}
    aria-valuetext="Saturation {Math.round(hsva.s)}%, brightness {Math.round(hsva.v)}%"
    onpointerdown={(event) => {
      area!.setPointerCapture(event.pointerId);
      pickArea(event);
    }}
    onpointermove={(event) => {
      if (area!.hasPointerCapture(event.pointerId)) pickArea(event);
    }}
    onkeydown={areaKeys}
  >
    <div
      class="absolute pointer-events-none handle"
      style="left: {hsva.s}%; top: {100 - hsva.v}%; --swatch: {hex};"
    ></div>
  </div>

  <div class="flex gap-3 items-center">
    {#if EyeDropper}
      <button
        type="button"
        class="grid shrink-0 place-items-center rounded-md transition size-8 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
        aria-label="Pick a colour from the screen"
        onclick={pickFromScreen}
      >
        <PipetteIcon class="size-4" />
      </button>
    {/if}
    <div class="flex flex-col flex-1 gap-3">
      <input
        type="range"
        min="0"
        max="359"
        class="picker-track"
        style="background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); --swatch: hsl({hsva.h} 100% 50%);"
        aria-label="Hue"
        value={Math.round(hsva.h)}
        oninput={(event) => updateHsva({ h: Number(event.currentTarget.value) })}
      />
      <input
        type="range"
        min="0"
        max="100"
        class="picker-track"
        style="background: linear-gradient(to right, transparent, {hex}), {CHECKERBOARD}; --swatch: {formatColour(
          active,
        )};"
        aria-label="Opacity"
        value={Math.round(hsva.a * 100)}
        oninput={(event) => updateHsva({ a: Number(event.currentTarget.value) / 100 })}
      />
    </div>
    <div
      class="shrink-0 rounded-md ring-1 ring-inset ring-black/10 size-8 dark:ring-white/10"
      style="background: {asLayer(formatValue(model))}, {CHECKERBOARD};"
      aria-hidden="true"
    ></div>
  </div>

  <div class="flex gap-2">
    <label
      class="flex flex-1 gap-1.5 items-center px-2.5 min-w-0 h-8 text-xs rounded-md bg-zinc-100 dark:bg-zinc-700/70"
    >
      <span class="text-zinc-500 dark:text-zinc-400">#</span>
      <input
        class="flex-1 p-0 min-w-0 font-mono text-xs uppercase bg-transparent border-0 outline-none select-text"
        aria-label="Hex colour"
        value={hex.slice(1)}
        spellcheck="false"
        autocomplete="off"
        maxlength="7"
        oninput={(event) => setHex(event.currentTarget.value)}
        onkeydown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        onblur={(event) => {
          setHex(event.currentTarget.value, true);
          event.currentTarget.value = hex.slice(1);
        }}
      />
    </label>
    <label
      class="flex shrink-0 items-center px-2.5 w-16 h-8 text-xs rounded-md bg-zinc-100 dark:bg-zinc-700/70"
    >
      <input
        type="number"
        min="0"
        max="100"
        class="p-0 w-full min-w-0 text-xs text-right bg-transparent border-0 outline-none select-text picker-number"
        aria-label="Opacity percent"
        value={Math.round(active.a * 100)}
        oninput={(event) => {
          if (event.currentTarget.value !== "")
            updateHsva({ a: clamp(Number(event.currentTarget.value), 0, 100) / 100 });
        }}
      />
      <span class="text-zinc-500 dark:text-zinc-400">%</span>
    </label>
  </div>

  {#if shownPresets.length}
    <div class="grid grid-cols-9 gap-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-700">
      {#each shownPresets as preset (preset)}
        <button
          type="button"
          class="rounded-md ring-1 ring-inset transition aspect-square ring-black/10 hover:scale-110 dark:ring-white/10"
          style="background: {asLayer(preset)}, {CHECKERBOARD};"
          aria-label="Apply preset {preset}"
          onclick={() => applyPreset(preset)}
        ></button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .handle {
    width: 1.125rem;
    height: 1.125rem;
    border-radius: 9999px;
    border: 2px solid white;
    background:
      linear-gradient(var(--swatch), var(--swatch)),
      repeating-conic-gradient(#d4d4d8 0% 25%, #ffffff 0% 50%) 50% / 6px 6px;
    box-shadow:
      0 0 0 1px rgb(0 0 0 / 0.15),
      0 1px 3px rgb(0 0 0 / 0.3);
    transform: translate(-50%, -50%);
    transition:
      transform 120ms ease,
      box-shadow 120ms ease;
  }

  .handle-selected {
    z-index: 1;
    transform: translate(-50%, -50%) scale(1.2);
    box-shadow:
      0 0 0 2px rgb(24 24 27 / 0.85),
      0 2px 6px rgb(0 0 0 / 0.35);
  }

  :global(.dark) .handle-selected {
    box-shadow:
      0 0 0 2px rgb(255 255 255 / 0.9),
      0 2px 6px rgb(0 0 0 / 0.5);
  }

  .picker-number {
    appearance: textfield;
  }

  .picker-number::-webkit-inner-spin-button,
  .picker-number::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }

  .picker-track {
    appearance: none;
    display: block;
    width: 100%;
    height: 0.75rem;
    border-radius: 9999px;
    cursor: pointer;
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.1);
  }

  .picker-track::-webkit-slider-thumb {
    appearance: none;
    width: 1.125rem;
    height: 1.125rem;
    border: 2px solid white;
    border-radius: 9999px;
    background: var(--swatch);
    box-shadow:
      0 0 0 1px rgb(0 0 0 / 0.15),
      0 1px 3px rgb(0 0 0 / 0.3);
  }

  .picker-track::-moz-range-thumb {
    width: 1.125rem;
    height: 1.125rem;
    box-sizing: border-box;
    border: 2px solid white;
    border-radius: 9999px;
    background: var(--swatch);
    box-shadow:
      0 0 0 1px rgb(0 0 0 / 0.15),
      0 1px 3px rgb(0 0 0 / 0.3);
  }
</style>
