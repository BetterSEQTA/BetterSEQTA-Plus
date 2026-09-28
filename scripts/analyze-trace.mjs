/**
 * Chrome trace analyzer — aggregates hotspots for BetterSEQTA+ optimization.
 * Usage: node scripts/analyze-trace.mjs <path-to-trace.json>
 */
import fs from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node scripts/analyze-trace.mjs <trace.json>");
  process.exit(1);
}

const raw = fs.readFileSync(path, "utf8");
const { traceEvents } = JSON.parse(raw);

const DURATION_PHASES = new Set(["X", "b", "e"]);
const openStacks = new Map(); // key -> { name, cat, args, ts }

const byName = new Map();
const byCat = new Map();
const byUrl = new Map();
const byFunction = new Map();
const layoutEvents = [];
const paintEvents = [];
const longTasks = [];
const timers = [];
const observers = [];
const hitTests = [];
const betterseqtaHits = new Map();
const ipcMessages = new Map();
const gcEvents = [];

let minTs = Infinity;
let maxTs = -Infinity;

function add(map, key, dur, count = 1) {
  const e = map.get(key) ?? { dur: 0, count: 0 };
  e.dur += dur;
  e.count += count;
  map.set(key, e);
}

function stackKey(ev) {
  return `${ev.pid}:${ev.tid}:${ev.name}:${ev.ts}`;
}

for (const ev of traceEvents) {
  if (ev.ts != null) {
    minTs = Math.min(minTs, ev.ts);
    maxTs = Math.max(maxTs, ev.ts);
  }

  const ph = ev.ph;
  const name = ev.name ?? "";
  const cat = ev.cat ?? "";
  const args = ev.args ?? {};

  if (ph === "b") {
    openStacks.set(`${ev.pid}:${ev.tid}:${ev.id ?? name}`, ev);
    continue;
  }

  let dur = ev.dur ?? 0;
  if (ph === "e" && ev.id != null) {
    const start = openStacks.get(`${ev.pid}:${ev.tid}:${ev.id}`);
    if (start) dur = ev.ts - start.ts;
  }
  if (dur <= 0 && ph !== "X") continue;

  add(byName, name, dur);

  const catParts = cat.split(",").filter(Boolean);
  for (const c of catParts.length ? catParts : [cat || "(none)"]) {
    add(byCat, c, dur);
  }

  const url =
    args.data?.url ??
    args.url ??
    args.fileName ??
    args.data?.scriptName ??
    args.data?.frame ??
    "";
  if (url && typeof url === "string" && dur > 0) {
    add(byUrl, url.slice(0, 200), dur);
  }

  const fn =
    args.data?.functionName ??
    args.functionName ??
    args.data?.columnNumber != null
      ? `${args.data?.functionName ?? name}@${args.data?.url ?? ""}:${args.data?.lineNumber ?? "?"}`
      : "";
  if (fn && dur > 100) {
    add(byFunction, String(fn).slice(0, 250), dur);
  }

  if (/Layout|UpdateLayoutTree|InvalidateLayout|LocalFrameView::performLayout/i.test(name)) {
    layoutEvents.push({ name, dur, ts: ev.ts, cat });
  }
  if (/Paint|Raster|DrawFrame|CompositeLayers|UpdateLayer/i.test(name)) {
    paintEvents.push({ name, dur, ts: ev.ts });
  }
  if (name === "RunTask" && dur > 50000) {
    longTasks.push({ dur, ts: ev.ts, cat, args: JSON.stringify(args).slice(0, 300) });
  }
  if (/Timer|setTimeout|setInterval|FireIdleCallback|requestAnimationFrame|RequestAnimationFrame/i.test(name)) {
    timers.push({ name, dur, ts: ev.ts });
  }
  if (/MutationObserver|ResizeObserver|IntersectionObserver|DeliverObservations|NotifyMutation/i.test(name)) {
    observers.push({ name, dur, ts: ev.ts });
  }
  if (/HitTest|FindElement|ElementAt/i.test(name)) {
    hitTests.push({ name, dur, ts: ev.ts });
  }
  if (/V8\.GC|GC_|MajorGC|MinorGC|IncrementalMarking/i.test(name)) {
    gcEvents.push({ name, dur, ts: ev.ts });
  }
  if (/IPC|MessagePort|postMessage/i.test(name)) {
    add(ipcMessages, name, dur);
  }

  const blob = JSON.stringify(args);
  if (/betterseqta|BetterSEQTA|bsplus|SEQTA\.ts|monofile|AddBetterSEQTA/i.test(blob + name + url)) {
    const key = `${name} | ${(url || blob).slice(0, 120)}`;
    add(betterseqtaHits, key, dur);
  }
}

function top(map, n = 40, minCount = 1) {
  return [...map.entries()]
    .filter(([, v]) => v.count >= minCount)
    .sort((a, b) => b[1].dur - a[1].dur)
    .slice(0, n)
    .map(([k, v]) => ({
      key: k,
      totalMs: (v.dur / 1000).toFixed(1),
      count: v.count,
      avgMs: (v.dur / v.count / 1000).toFixed(2),
    }));
}

const traceDurationMs = ((maxTs - minTs) / 1000).toFixed(0);

console.log(JSON.stringify({
  summary: {
    traceDurationMs,
    eventCount: traceEvents.length,
    layoutCount: layoutEvents.length,
    layoutTotalMs: (layoutEvents.reduce((s, e) => s + e.dur, 0) / 1000).toFixed(1),
    paintCount: paintEvents.length,
    paintTotalMs: (paintEvents.reduce((s, e) => s + e.dur, 0) / 1000).toFixed(1),
    longTaskCount: longTasks.length,
    longTaskTotalMs: (longTasks.reduce((s, e) => s + e.dur, 0) / 1000).toFixed(1),
    timerCount: timers.length,
    timerTotalMs: (timers.reduce((s, e) => s + e.dur, 0) / 1000).toFixed(1),
    observerCount: observers.length,
    observerTotalMs: (observers.reduce((s, e) => s + e.dur, 0) / 1000).toFixed(1),
    hitTestCount: hitTests.length,
    hitTestTotalMs: (hitTests.reduce((s, e) => s + e.dur, 0) / 1000).toFixed(1),
    gcCount: gcEvents.length,
    gcTotalMs: (gcEvents.reduce((s, e) => s + e.dur, 0) / 1000).toFixed(1),
  },
  topEventNames: top(byName, 50),
  topCategories: top(byCat, 30),
  topUrls: top(byUrl, 40),
  topFunctions: top(byFunction, 40, 1),
  topBetterseqta: top(betterseqtaHits, 50),
  topLongTasks: longTasks.sort((a, b) => b.dur - a.dur).slice(0, 20).map(e => ({
    ms: (e.dur / 1000).toFixed(1),
    cat: e.cat,
    args: e.args,
  })),
  topLayout: layoutEvents.sort((a, b) => b.dur - a.dur).slice(0, 15).map(e => ({
    name: e.name, ms: (e.dur / 1000).toFixed(2),
  })),
  topObservers: observers.sort((a, b) => b.dur - a.dur).slice(0, 15).map(e => ({
    name: e.name, ms: (e.dur / 1000).toFixed(2), count: 1,
  })),
}, null, 2));
