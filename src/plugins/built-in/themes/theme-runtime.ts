/**
 * Theme runtime: minimal, locked-down hooks for themes that need a clock or
 * a few decorative DOM elements (e.g. Noir City's day/night cycle and
 * animated cars).
 *
 * Hard constraints:
 *   - No `eval` and no execution of theme-author JS. Themes reference built-in
 *     functions by name from a fixed allowlist.
 *   - No network, storage, cookies, or SEQTA DOM access.
 *   - Only mutations allowed are: CSS custom properties on <html>, a single
 *     `data-city-state` attribute on <html>, and appending a fixed set of
 *     decorative elements into `#bsplus-theme-runtime-root`.
 */

export type ThemeScriptSpec = {
  onLoad?: string;
  interval?: number;
  onInterval?: string;
};

export type ThemeDomSpec = {
  roadStrip?: boolean;
  cars?: number;
  /** @deprecated Use cityLayers flicker overlays instead. */
  flickers?: number;
  cityLayers?: boolean;
};

const ROOT_ID = "bsplus-theme-runtime-root";
const WALLPAPER_ID = "bsplus-theme-wallpaper";
const MAX_CARS = 10;
const MAX_FLICKERS = 8;
const MIN_INTERVAL_MS = 60_000;
const DEFAULT_INTERVAL_MS = 600_000;

/**
 * IDs of decorative city layers injected when `themeDom.cityLayers` is on.
 * Order matters: earlier entries paint behind later ones. Buildings sit
 * behind the lit batches (so windows draw over the silhouettes); flicker
 * frames sit over the lit batches so blinking windows hide steady ones.
 * Sun and moon are last so they paint over everything else in the
 * wallpaper stack (still behind #main via z-index 0).
 */
/**
 * `city-buildings` always paints the night panorama; `city-day` paints
 * the day panorama on top with opacity controlled by `--city-day-
 * opacity`. The two stack so we can CSS-transition opacity between
 * them at the day boundary, instead of snapping background-image (which
 * doesn't animate). */
const CITY_LAYER_IDS = [
  "city-buildings",
  "city-day",
  "city-lights-1",
  "city-lights-2",
  "city-lights-3",
  "city-flicker-a",
  "city-flicker-b",
  "city-sun",
  "city-moon",
] as const;

// Built-in functions themes may reference by exact string match.
const BUILTINS: Record<string, () => void> = {
  "setTimeState()": setTimeState,
  "setCityTime()": setCityTime,
};

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let lastTimeState: TimeState | null = null;
let lastDomSpec: ThemeDomSpec | null = null;
let bodyObserver: MutationObserver | null = null;
let pageshowListenerAttached = false;
let repaintScheduled = false;

type TimeState = "night" | "dawn" | "day" | "dusk" | "evening";

/**
 * Sky colour anchors. Exactly one of these is published as
 * `--city-sky-color` at any given moment, based on the discrete
 * `timeStateForMinutes()` bucket. CSS handles the cross-fade between
 * anchors via its own `transition: background-color` rule, so the sky
 * is a flat colour during the whole duration of each phase and only
 * animates on the boundary crossing itself.
 *
 *   night    near-black with a hint of blue
 *   dawn     peachy sunrise — brighter than the previous dusty rose so
 *            the lerp from night -> dawn -> day doesn't pass through
 *            desaturated grey-purple in the middle.
 *   day      soft pastel "skyblue" (#87CEEB, the CSS named colour). Was
 *            previously a desaturated steel-blue that read as grey at
 *            mid-lightness.
 *   dusk     warm orange sunset, matching dawn's brightness so the
 *            afternoon transition stays colourful.
 *   evening  deep indigo, low chroma, settling toward night.
 */
const SKY_COLOR: Record<TimeState, string> = {
  night: "#0d0d0f",
  dawn: "#cc6a5a",
  day: "#87ceeb",
  dusk: "#d56a3a",
  evening: "#111118",
};

/* ============================================================ *
 * Dev-only time picker
 *
 * Flip this to `false` to remove the floating slider entirely
 * (it's also automatically off in production builds via the
 * `IS_DEV` check below).
 * ============================================================ */
const DEV_TIME_PICKER_ENABLED = true;

const DEV_OVERRIDE_KEY = "bsplus-city-time-override";
const IS_DEV = import.meta.env.MODE === "development";
const DEV_PICKER_ID = "bsplus-city-dev-picker";

function readDevOverride(): number | null {
  if (!IS_DEV || !DEV_TIME_PICKER_ENABLED) return null;
  try {
    const raw = localStorage.getItem(DEV_OVERRIDE_KEY);
    if (raw === null) return null;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0 && n < 24 * 60) return n;
  } catch {
    // localStorage may be unavailable; ignore.
  }
  return null;
}

/**
 * "Balanced 1h wedges" schedule:
 *
 *   00:00 .. 05:30   night    (dark)
 *   05:30 .. 06:30   dawn     (peachy sunrise, ramping up)
 *   06:30 .. 18:00   day      (pastel blue, the big stable block)
 *   18:00 .. 19:00   dusk     (warm sunset)
 *   19:00 .. 21:00   evening  (deep indigo, fading toward night)
 *   21:00 .. 24:00   night
 *
 * The discrete bucket here drives `data-city-state` (used by the car
 * sprite swap and the day panorama). The continuous sky-colour lerp in
 * `TIME_BOUNDARIES` MUST use the same minute markers so the boundary
 * the user sees in the dev slider matches the visible colour change.
 */
function timeStateForMinutes(minutes: number): TimeState {
  if (minutes < 5 * 60 + 30) return "night";
  if (minutes < 6 * 60 + 30) return "dawn";
  if (minutes < 18 * 60) return "day";
  if (minutes < 19 * 60) return "dusk";
  if (minutes < 21 * 60) return "evening";
  return "night";
}

function getMinutesOfDay(now: Date = new Date()): number {
  const override = readDevOverride();
  if (override !== null) return override;
  return now.getHours() * 60 + now.getMinutes();
}

function getTimeState(now: Date = new Date()): TimeState {
  return timeStateForMinutes(getMinutesOfDay(now));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Sky colour publishing is intentionally NOT time-interpolated. We
 * publish exactly one of the five `SKY_COLOR` anchors based on the
 * discrete state from `timeStateForMinutes()`, and let CSS handle the
 * cross-fade via its own `transition: background-color` on #content.
 *
 * That way the sky is a flat colour for the entire duration of each
 * phase, and only animates between two anchors AT THE MOMENT the state
 * boundary is crossed. The animation duration is decoupled from how
 * long the phase lasts.
 *
 * Removed: the previous `lerpColor` + `TIME_BOUNDARIES` minute table.
 */
function skyColorForState(state: TimeState): string {
  return SKY_COLOR[state];
}

function darknessForMinutes(minutes: number): number {
  const noon = 12 * 60;
  let distance = Math.abs(minutes - noon);
  if (distance > 12 * 60) distance = 24 * 60 - distance;
  return clamp01(distance / (12 * 60));
}

/**
 * Per-phase lit-window opacities. Like `SKY_COLOR`, this is a flat lookup
 * by discrete state — NOT a continuous function of minute-of-day. The
 * existing 10s CSS `transition: opacity` on #city-lights-1/2/3 handles
 * the cross-fade between phases when the discrete state changes.
 *
 *   night    everything lit — peak window activity
 *   dawn     batch 1 only — a few early risers, lobby lights
 *   day      all off
 *   dusk     batch 1 fully on, batch 2 fading in
 *   evening  batches 1 + 2 fully on, batch 3 partially — peak evening
 *
 * Tweak these freely; they're purely cosmetic and don't have to add up
 * to anything.
 */
const LIT_OPACITIES: Record<TimeState, [number, number, number]> = {
  night:   [1.0, 1.0, 1.0],
  dawn:    [1.0, 0.0, 0.0],
  day:     [0.0, 0.0, 0.0],
  dusk:    [1.0, 0.6, 0.0],
  evening: [1.0, 1.0, 0.5],
};

function litOpacitiesForState(state: TimeState): [number, number, number] {
  return LIT_OPACITIES[state];
}

function sunForMinutes(minutes: number): { t: number; opacity: number } {
  const sunrise = 6 * 60;
  const sunset = 19 * 60;
  if (minutes < sunrise || minutes >= sunset) return { t: 0, opacity: 0 };
  return {
    t: (minutes - sunrise) / (sunset - sunrise),
    opacity: 1,
  };
}

function moonForMinutes(minutes: number): { t: number; opacity: number } {
  const sun = sunForMinutes(minutes);
  if (sun.opacity > 0) return { t: 0, opacity: 0 };
  const dusk = 19 * 60 + 30;
  const dawn = 5 * 60;
  if (minutes >= dusk) {
    return { t: clamp01((minutes - dusk) / (24 * 60 - dusk)), opacity: 1 };
  }
  if (minutes < dawn) {
    return { t: clamp01((dawn - minutes) / dawn), opacity: 1 };
  }
  return { t: 0.5, opacity: 1 };
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Read the clock and update `data-city-state` + sky colour on <html>. Only
 * writes when the state actually changes, so CSS transitions are driven by
 * real state changes rather than every tick.
 */
export function setTimeState(): void {
  setCityTime();
}

/**
 * Read the clock and publish continuous city variables plus the discrete
 * `data-city-state` bucket used by CSS that still needs hard cuts (e.g. day
 * panorama swap, night car sprites).
 */
export function setCityTime(): void {
  const minutes = getMinutesOfDay();
  const state = timeStateForMinutes(minutes);
  const html = document.documentElement;

  if (state !== lastTimeState) {
    lastTimeState = state;
    html.setAttribute("data-city-state", state);
    html.style.setProperty("--city-time-state", state);
  }

  const darkness = darknessForMinutes(minutes);
  const [lit1, lit2, lit3] = litOpacitiesForState(state);
  const sun = sunForMinutes(minutes);
  const moon = moonForMinutes(minutes);

  html.style.setProperty("--city-sky-color", skyColorForState(state));
  html.style.setProperty("--city-darkness", String(darkness));
  // 1 only during the `day` phase; 0 in every other phase. CSS cross-
  // fades the day panorama over the night panorama using this on a 10s
  // opacity transition, which avoids the visual snap that
  // `background-image` swaps cause (background-image doesn't animate).
  html.style.setProperty("--city-day-opacity", state === "day" ? "1" : "0");
  html.style.setProperty("--city-lit-1-opacity", String(lit1));
  html.style.setProperty("--city-lit-2-opacity", String(lit2));
  html.style.setProperty("--city-lit-3-opacity", String(lit3));
  html.style.setProperty("--city-sun-t", String(sun.t));
  html.style.setProperty("--city-sun-opacity", String(sun.opacity));
  html.style.setProperty("--city-moon-t", String(moon.t));
  html.style.setProperty("--city-moon-opacity", String(moon.opacity));
}

/**
 * Validate the script spec strictly. Returns true if the spec is safe to run.
 * Themes that include unknown calls or non-builtins are rejected wholesale.
 */
export function validateThemeScript(script: unknown): script is ThemeScriptSpec {
  if (script == null) return true; // optional field
  if (typeof script !== "object") return false;
  const s = script as Record<string, unknown>;
  for (const key of Object.keys(s)) {
    if (key !== "onLoad" && key !== "interval" && key !== "onInterval") {
      return false;
    }
  }
  if (s.onLoad !== undefined && !isAllowedCall(s.onLoad)) return false;
  if (s.onInterval !== undefined && !isAllowedCall(s.onInterval)) return false;
  if (
    s.interval !== undefined &&
    (typeof s.interval !== "number" ||
      !Number.isFinite(s.interval) ||
      s.interval < MIN_INTERVAL_MS)
  ) {
    return false;
  }
  return true;
}

function isAllowedCall(value: unknown): boolean {
  return typeof value === "string" && value in BUILTINS;
}

/**
 * Validate the DOM spec. Caps counts and rejects unknown keys.
 */
export function validateThemeDom(dom: unknown): dom is ThemeDomSpec {
  if (dom == null) return true;
  if (typeof dom !== "object") return false;
  const d = dom as Record<string, unknown>;
  for (const key of Object.keys(d)) {
    if (key !== "roadStrip" && key !== "cars" && key !== "flickers" && key !== "cityLayers") {
      return false;
    }
  }
  if (d.cityLayers !== undefined && typeof d.cityLayers !== "boolean") return false;
  if (d.roadStrip !== undefined && typeof d.roadStrip !== "boolean") return false;
  if (
    d.cars !== undefined &&
    (typeof d.cars !== "number" ||
      !Number.isInteger(d.cars) ||
      d.cars < 0 ||
      d.cars > MAX_CARS)
  ) {
    return false;
  }
  if (
    d.flickers !== undefined &&
    (typeof d.flickers !== "number" ||
      !Number.isInteger(d.flickers) ||
      d.flickers < 0 ||
      d.flickers > MAX_FLICKERS)
  ) {
    return false;
  }
  return true;
}

function callBuiltin(name: string): void {
  const fn = BUILTINS[name];
  if (!fn) return;
  try {
    fn();
  } catch (e) {
    console.error("[ThemeRuntime] Built-in failed:", name, e);
  }
}

/**
 * Run a validated themeScript: invoke `onLoad` once and start an interval
 * timer for `onInterval` if configured. Idempotent — clears any prior
 * interval before scheduling a new one so repeated calls (e.g. during
 * theme re-apply races) don't leak timers.
 */
export function runThemeScript(script: ThemeScriptSpec | undefined): void {
  if (intervalHandle !== null) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  if (!script || !validateThemeScript(script)) return;
  if (script.onLoad) callBuiltin(script.onLoad);
  if (script.onInterval) {
    const period = Math.max(MIN_INTERVAL_MS, script.interval ?? DEFAULT_INTERVAL_MS);
    intervalHandle = setInterval(() => callBuiltin(script.onInterval!), period);
  }
}

function getOrCreateRoot(): HTMLElement {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ROOT_ID;
    root.setAttribute("aria-hidden", "true");
  }
  // Always parent under <body>: the runtime root uses `position: fixed`
  // and needs to escape any stacking context SEQTA puts on `#content` so
  // the sidebar can layer over it cleanly via z-index.
  if (root.parentElement !== document.body) {
    document.body.appendChild(root);
  }
  return root;
}

/**
 * The wallpaper container is a *separate* sibling of the runtime root,
 * never a child. We keep it independent so its existence is determined
 * solely by `themeDom.cityLayers`, and so the road strip's tight 60px
 * bottom geometry can't accidentally constrain the full-area city
 * layers. All CSS positioning of cityscape/sun/moon happens via
 * `position: fixed` on the layer divs themselves; this container only
 * groups them for cheap teardown.
 */
function getOrCreateWallpaper(): HTMLElement {
  let wallpaper = document.getElementById(WALLPAPER_ID);
  if (!wallpaper) {
    wallpaper = document.createElement("div");
    wallpaper.id = WALLPAPER_ID;
    wallpaper.setAttribute("aria-hidden", "true");
  }
  if (wallpaper.parentElement !== document.body) {
    document.body.appendChild(wallpaper);
  }
  return wallpaper;
}

/** Content scripts run at `document_start`; defer until `<body>` exists. */
function whenBodyReady(run: () => void): void {
  if (document.body) {
    run();
    return;
  }
  document.addEventListener("DOMContentLoaded", run, { once: true });
}

function runtimeRootNeedsContent(spec: ThemeDomSpec): boolean {
  const root = document.getElementById(ROOT_ID);
  if (!root) return true;
  if (spec.roadStrip && !document.getElementById("city-road")) return true;
  const carCount = Math.min(spec.cars ?? 0, MAX_CARS);
  if (carCount > 0 && root.querySelector(".city-car") === null) return true;
  return false;
}

function cityWallpaperNeedsLayers(): boolean {
  if (!lastDomSpec?.cityLayers) return false;
  const wallpaper = document.getElementById(WALLPAPER_ID);
  if (!wallpaper) return true;
  return wallpaper.querySelector("#city-buildings") === null;
}

function repaintThemeDomIfNeeded(): void {
  if (!lastDomSpec || !document.body) return;
  if (runtimeRootNeedsContent(lastDomSpec)) {
    const root = getOrCreateRoot();
    populateRoot(root, lastDomSpec);
  }
  if (cityWallpaperNeedsLayers()) {
    const wallpaper = getOrCreateWallpaper();
    populateWallpaper(wallpaper);
  }
}

function scheduleRepaintThemeDomIfNeeded(): void {
  if (repaintScheduled) return;
  repaintScheduled = true;
  requestAnimationFrame(() => {
    repaintScheduled = false;
    repaintThemeDomIfNeeded();
  });
}

function themeDomNeedsRepaint(): boolean {
  if (!lastDomSpec) return false;
  if (!document.getElementById(ROOT_ID)) return true;
  if (lastDomSpec.cityLayers && !document.getElementById(WALLPAPER_ID)) {
    return true;
  }
  return runtimeRootNeedsContent(lastDomSpec) || cityWallpaperNeedsLayers();
}

function populateWallpaper(wallpaper: HTMLElement): void {
  while (wallpaper.firstChild) wallpaper.removeChild(wallpaper.firstChild);
  for (const id of CITY_LAYER_IDS) {
    const layer = document.createElement("div");
    layer.id = id;
    // `class` lets the theme target all cityscape overlays with a single
    // rule for the shared fixed-positioning + background-attachment block.
    if (
      id.startsWith("city-buildings") ||
      id === "city-day" ||
      id.startsWith("city-lights") ||
      id.startsWith("city-flicker")
    ) {
      layer.className = "city-cityscape-layer";
    }
    wallpaper.appendChild(layer);
  }
}

const CAR_VARIANTS = ["car-sedan", "car-hatchback", "car-boxy"] as const;

/**
 * Populate the runtime root with the decorative DOM described by `dom`.
 * Always wipes the root's existing children first so repeated calls leave
 * exactly one road / N cars, no duplicates. The runtime root contains
 * ONLY the road strip and cars — full-area city layers (buildings, lit
 * batches, flicker, sun, moon) live in a separate `#bsplus-theme-wallpaper`
 * container so the root's tight 60px bottom strip never grows.
 */
function populateRoot(root: HTMLElement, dom: ThemeDomSpec): void {
  while (root.firstChild) root.removeChild(root.firstChild);

  if (dom.roadStrip) {
    const road = document.createElement("div");
    road.id = "city-road";
    root.appendChild(road);
  }

  const carCount = Math.min(dom.cars ?? 0, MAX_CARS);
  for (let i = 1; i <= carCount; i++) {
    const car = document.createElement("div");
    const variant = CAR_VARIANTS[(i - 1) % CAR_VARIANTS.length];
    car.className = `city-car city-car-${i} ${variant}`;
    root.appendChild(car);
  }

  // Legacy scattered flicker dots. Themes that opt into `cityLayers` use
  // the overlay-cross-fade flicker instead, so we skip these when the new
  // system is active to avoid double flickering.
  if (!dom.cityLayers) {
    const flickerCount = Math.min(dom.flickers ?? 0, MAX_FLICKERS);
    for (let i = 1; i <= flickerCount; i++) {
      const flicker = document.createElement("div");
      flicker.className = `city-win-flicker city-win-flicker-${i}`;
      root.appendChild(flicker);
    }
  }
}

/**
 * Watch `<body>` for the runtime root or wallpaper being removed (SPA
 * re-renders, external code, etc.) and re-inject from the cached spec.
 * Without this, intermittent reloads could leave the page with no road/
 * cars or no cityscape layers even though the runtime believed they were
 * mounted.
 */
function ensureBodyObserver(): void {
  if (bodyObserver) return;
  const attach = () => {
    if (!document.body || bodyObserver) return;
    bodyObserver = new MutationObserver(() => {
      if (themeDomNeedsRepaint()) scheduleRepaintThemeDomIfNeeded();
    });
    // Only direct children of <body>: the theme nodes are appended there.
    // Watching the full subtree fired on every SEQTA menu/content mutation and
    // could repaint decorative layers mid-navigation (felt like a page reload).
    bodyObserver.observe(document.body, { childList: true });
  };
  whenBodyReady(attach);

  if (!pageshowListenerAttached && typeof window !== "undefined") {
    pageshowListenerAttached = true;
    window.addEventListener(
      "pageshow",
      (event) => {
        if (event.persisted) repaintThemeDomIfNeeded();
      },
      { capture: true },
    );
  }
}

/**
 * Inject the decorative DOM scaffolding required by themes that opt in via
 * `themeDom`. Idempotent: safe to call multiple times in a row without
 * an intervening `clearThemeRuntime`. Everything is positioned/styled by
 * theme CSS.
 */
export function injectThemeDom(dom: ThemeDomSpec | undefined): void {
  if (!dom || !validateThemeDom(dom)) return;
  lastDomSpec = dom;
  ensureBodyObserver();

  const mount = () => {
    if (!lastDomSpec) return;
    const spec = lastDomSpec;
    if (runtimeRootNeedsContent(spec)) {
      const root = getOrCreateRoot();
      populateRoot(root, spec);
    }
    if (spec.cityLayers) {
      if (cityWallpaperNeedsLayers()) {
        const wallpaper = getOrCreateWallpaper();
        populateWallpaper(wallpaper);
      }
    } else {
      // Theme switched from a cityLayers theme to one without — tear down
      // any leftover wallpaper so we don't paint stale buildings/sun.
      document.getElementById(WALLPAPER_ID)?.remove();
    }

    // Suppress the slow `transition: background-color` for the very first
    // frame after the theme CSS lands. Without this, the browser
    // interpolates from SEQTA's pre-theme `background: unset` (light) to
    // var(--city-sky-color) over 30s on every page load. Double rAF: the
    // first runs after the next layout, the second after that frame has
    // actually been painted with the attribute set, so we can safely
    // remove it and let real state changes (night -> dawn etc.) animate.
    const html = document.documentElement;
    html.setAttribute("data-city-just-applied", "");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        html.removeAttribute("data-city-just-applied");
      });
    });

    mountDevTimePicker();
  };

  whenBodyReady(mount);
}

/**
 * Dev-only floating time picker. Renders a slider (0..1440 minutes) plus a
 * checkbox to toggle "use real clock". The override is persisted in
 * `localStorage` so it survives reloads during a debugging session. The
 * whole block is dead code in production builds (the `IS_DEV` check is
 * static and Vite tree-shakes it out).
 */
function mountDevTimePicker(): void {
  if (!IS_DEV || !DEV_TIME_PICKER_ENABLED) return;
  if (document.getElementById(DEV_PICKER_ID)) return;

  const initialOverride = readDevOverride();
  const startMinutes =
    initialOverride ?? new Date().getHours() * 60 + new Date().getMinutes();
  const useReal = initialOverride === null;

  const panel = document.createElement("div");
  panel.id = DEV_PICKER_ID;
  panel.setAttribute("aria-label", "City time override (dev mode)");
  // Inline styles so the panel can't be styled away by the active theme.
  Object.assign(panel.style, {
    position: "fixed",
    bottom: "12px",
    right: "12px",
    zIndex: "2147483647",
    padding: "10px 12px",
    background: "rgba(20, 20, 24, 0.92)",
    color: "#e8e8f0",
    font: "12px/1.4 system-ui, sans-serif",
    borderRadius: "8px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    pointerEvents: "auto",
    userSelect: "none",
    minWidth: "220px",
  } satisfies Partial<CSSStyleDeclaration>);

  const header = document.createElement("div");
  header.textContent = "City time (dev)";
  Object.assign(header.style, {
    fontWeight: "600",
    marginBottom: "6px",
    opacity: "0.85",
  } satisfies Partial<CSSStyleDeclaration>);
  panel.appendChild(header);

  const realRow = document.createElement("label");
  Object.assign(realRow.style, {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "8px",
    cursor: "pointer",
  } satisfies Partial<CSSStyleDeclaration>);
  const realCheck = document.createElement("input");
  realCheck.type = "checkbox";
  realCheck.checked = useReal;
  realRow.appendChild(realCheck);
  const realLabel = document.createElement("span");
  realLabel.textContent = "Use real clock";
  realRow.appendChild(realLabel);
  panel.appendChild(realRow);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = String(24 * 60 - 1);
  slider.step = "5";
  slider.value = String(startMinutes);
  slider.disabled = useReal;
  Object.assign(slider.style, {
    width: "100%",
    accentColor: "#c8b97a",
  } satisfies Partial<CSSStyleDeclaration>);
  panel.appendChild(slider);

  const readout = document.createElement("div");
  Object.assign(readout.style, {
    marginTop: "4px",
    opacity: "0.8",
    fontVariantNumeric: "tabular-nums",
  } satisfies Partial<CSSStyleDeclaration>);
  panel.appendChild(readout);

  function paintReadout(): void {
    const m = Number(slider.value);
    readout.textContent = useReal
      ? "Real clock"
      : `${formatMinutes(m)} · ${timeStateForMinutes(m)}`;
  }

  function applyOverride(): void {
    try {
      if (realCheck.checked) {
        localStorage.removeItem(DEV_OVERRIDE_KEY);
      } else {
        localStorage.setItem(DEV_OVERRIDE_KEY, slider.value);
      }
    } catch (e) {
      console.warn("[ThemeRuntime] Could not persist time override:", e);
    }
    // Force a full re-publish next tick by clearing the cached bucket;
    // setCityTime() short-circuits the discrete state when unchanged but
    // always re-writes the continuous vars.
    lastTimeState = null;
    setCityTime();
    paintReadout();
  }

  realCheck.addEventListener("change", () => {
    slider.disabled = realCheck.checked;
    applyOverride();
  });
  slider.addEventListener("input", () => {
    if (realCheck.checked) {
      realCheck.checked = false;
      slider.disabled = false;
    }
    applyOverride();
  });

  paintReadout();
  document.body.appendChild(panel);
}

function unmountDevTimePicker(): void {
  document.getElementById(DEV_PICKER_ID)?.remove();
}

/**
 * Remove everything the runtime added: injected DOM, interval timer, custom
 * properties, and the `data-city-state` attribute.
 */
export function clearThemeRuntime(): void {
  if (intervalHandle !== null) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  // Disconnect the body observer BEFORE removing the root so the observer
  // doesn't see its own teardown removal as "root went missing" and try to
  // re-inject what we're trying to clear.
  if (bodyObserver) {
    bodyObserver.disconnect();
    bodyObserver = null;
  }
  lastDomSpec = null;
  lastTimeState = null;

  const root = document.getElementById(ROOT_ID);
  if (root) root.remove();
  document.getElementById(WALLPAPER_ID)?.remove();

  unmountDevTimePicker();

  const html = document.documentElement;
  html.removeAttribute("data-city-state");
  html.removeAttribute("data-city-just-applied");
  html.style.removeProperty("--city-time-state");
  html.style.removeProperty("--city-sky-color");
  html.style.removeProperty("--city-darkness");
  html.style.removeProperty("--city-day-opacity");
  html.style.removeProperty("--city-lit-1-opacity");
  html.style.removeProperty("--city-lit-2-opacity");
  html.style.removeProperty("--city-lit-3-opacity");
  html.style.removeProperty("--city-sun-t");
  html.style.removeProperty("--city-sun-opacity");
  html.style.removeProperty("--city-moon-t");
  html.style.removeProperty("--city-moon-opacity");
}
