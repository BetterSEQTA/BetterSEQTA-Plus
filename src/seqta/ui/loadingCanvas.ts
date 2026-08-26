import { pickLoadingVariant, variantRevealMs } from "./loadingVariants";

const smooth = (t: number) => t * t * (3 - 2 * t);

type SoftBlob = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rgb: string;
  phase: number;
  speed: number;
  amp?: number;
  rot?: number;
  drift?: number;
};

const DIFFUSE: SoftBlob[] = [
  { cx: 0.26, cy: 1.14, rx: 0.4, ry: 0.34, rgb: "37, 99, 235", phase: 0, speed: 1, amp: 0.26, rot: 0.38 },
  { cx: 0.58, cy: 1.2, rx: 0.44, ry: 0.38, rgb: "59, 130, 246", phase: 2.2, speed: 0.82, amp: 0.3, rot: -0.32 },
  { cx: 0.46, cy: 1.1, rx: 0.36, ry: 0.28, rgb: "29, 78, 216", phase: 4.4, speed: 1.12, amp: 0.22, rot: 0.45 },
  { cx: 0.8, cy: 1.08, rx: 0.3, ry: 0.3, rgb: "96, 165, 250", phase: 1.5, speed: 0.74, amp: 0.24, rot: -0.4 },
  { cx: 0.12, cy: 1.12, rx: 0.32, ry: 0.32, rgb: "37, 99, 235", phase: 3.6, speed: 0.96, amp: 0.25, rot: 0.34 },
  { cx: 0.68, cy: 1.06, rx: 0.26, ry: 0.24, rgb: "14, 116, 244", phase: 5.1, speed: 0.88, amp: 0.18, rot: -0.28 },
];

const TIDE: SoftBlob[] = [
  { cx: 0.5, cy: 0.68, rx: 0.72, ry: 0.11, rgb: "37, 99, 235", phase: 0, speed: 0.42, drift: 0.08 },
  { cx: 0.32, cy: 0.8, rx: 0.58, ry: 0.09, rgb: "59, 130, 246", phase: 2.4, speed: 0.36, drift: 0.06 },
  { cx: 0.68, cy: 0.86, rx: 0.64, ry: 0.12, rgb: "29, 78, 216", phase: 4.6, speed: 0.4, drift: 0.07 },
  { cx: 0.5, cy: 0.96, rx: 0.78, ry: 0.1, rgb: "96, 165, 250", phase: 1.1, speed: 0.33, drift: 0.05 },
];

const GLOBE_STAGGER_MS = 720;
const GLOBE_DOT_DUR_MS = 260;
const GLOBE_REVEAL_MS = GLOBE_STAGGER_MS + GLOBE_DOT_DUR_MS;

const GLOBE_DOTS = (() => {
  const n = 360;
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * i) / (n - 1);
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const x = Math.cos(theta) * ring;
    const z = Math.sin(theta) * ring;
    return { x, y, z, theta, rank: (x + 1 - y + 2) / 4 };
  });
})();

function stagger(
  elapsed: number,
  delay: number,
  dur: number,
  fade: boolean,
  reduced: boolean,
): number {
  if (reduced) return 1;
  if (elapsed < delay) return fade ? 1 : 0;
  const t = smooth(Math.min(1, (elapsed - delay) / dur));
  return fade ? 1 - t : t;
}

function cycle(
  elapsed: number,
  revealMs: number,
  holdMs: number,
): { t: number; fade: boolean; ambient: number } {
  const len = revealMs * 2 + holdMs;
  const tick = elapsed % len;
  if (tick < revealMs) {
    return { t: tick, fade: false, ambient: smooth(tick / revealMs) };
  }
  if (tick < revealMs + holdMs) {
    return { t: revealMs, fade: false, ambient: 1 };
  }
  const fadeT = tick - revealMs - holdMs;
  return { t: fadeT, fade: true, ambient: smooth((len - tick) / revealMs) };
}

function cssVar(root: HTMLElement, name: string, fallback: string): string {
  const inline = root.style.getPropertyValue(name).trim();
  if (inline) return inline;
  const computed = getComputedStyle(root).getPropertyValue(name).trim();
  return computed || fallback;
}

function isLightScheme(root: HTMLElement): boolean {
  return root.dataset.scheme === "light";
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  color: string,
  w: number,
  h: number,
  a: number,
  cols: number,
  rows: number,
) {
  if (cols <= 0 || rows <= 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = a;
  for (let c = 1; c < cols; c++) {
    const x = (w / cols) * c;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let r = 1; r < rows; r++) {
    const y = (h / rows) * r;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSoftBlobs(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsed: number,
  reduced: boolean,
  blobs: SoftBlob[],
  blur: number,
  fadeMs: number,
  tide: boolean,
  light: boolean,
) {
  const time = reduced ? 0 : elapsed * 0.001;
  const fadeIn = reduced ? 1 : smooth(Math.min(1, elapsed / fadeMs));
  const alphaBoost = light ? 1.18 : 1;

  ctx.save();
  ctx.globalAlpha = fadeIn;
  ctx.filter = `blur(${blur}px)`;

  for (const b of blobs) {
    const t = time * b.speed + b.phase;
    let x: number;
    let y: number;
    let rx: number;
    let ry: number;
    let a0: number;
    let a1: number;

    if (tide) {
      const breathe = 1 + Math.sin(t * 1.1) * 0.14;
      x = b.cx * w + Math.sin(t * 0.65) * w * (b.drift ?? 0);
      y = b.cy * h + Math.sin(t * 0.48 + b.phase) * h * 0.025;
      rx = b.rx * w;
      ry = b.ry * h * breathe;
      a0 = 0.38 * alphaBoost;
      a1 = 0.14 * alphaBoost;
    } else {
      const amp = b.amp ?? 0.2;
      const scale = 1 + Math.sin(t * 1.35) * amp;
      const stretch = 1 + Math.cos(t * 0.88) * amp * 0.55;
      x = b.cx * w + Math.sin(t * 0.52) * w * 0.04;
      y = b.cy * h + Math.sin(t * 0.41) * h * 0.01;
      rx = b.rx * w * scale;
      ry = b.ry * h * stretch;
      a0 = 0.5 * alphaBoost;
      a1 = 0.18 * alphaBoost;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * (b.rot ?? 0));
      x = 0;
      y = 0;
    }

    const radius = Math.max(rx, ry);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(${b.rgb}, ${a0})`);
    grad.addColorStop(tide ? 0.45 : 0.4, `rgba(${b.rgb}, ${a1})`);
    grad.addColorStop(1, `rgba(${b.rgb}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
    if (!tide) ctx.restore();
  }

  ctx.filter = "none";
  ctx.restore();
}

function drawDotGlobe(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsed: number,
  reduced: boolean,
  phaseElapsed: number,
  fade: boolean,
  ambient: number,
  light: boolean,
) {
  const time = reduced ? 0 : elapsed * 0.001;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const radius = Math.min(w, h) * 0.4;
  const yaw = time * 0.38;
  const pitch = Math.sin(time * 0.22) * 0.18;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const lx = Math.cos(time * 0.5);
  const ly = Math.sin(time * 0.32) * 0.45 + 0.35;
  const lz = Math.sin(time * 0.5);
  const lLen = Math.hypot(lx, ly, lz) || 1;

  ctx.save();
  ctx.globalAlpha = ambient;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.15);
  glow.addColorStop(0, light ? "rgba(37, 99, 235, 0.16)" : "rgba(37, 99, 235, 0.1)");
  glow.addColorStop(0.55, light ? "rgba(37, 99, 235, 0.05)" : "rgba(37, 99, 235, 0.03)");
  glow.addColorStop(1, "rgba(37, 99, 235, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - radius * 1.2, cy - radius * 1.2, radius * 2.4, radius * 2.4);

  const dots: {
    px: number;
    py: number;
    z: number;
    theta: number;
    nx: number;
    ny: number;
    nz: number;
    p: number;
  }[] = [];

  for (const dot of GLOBE_DOTS) {
    const p = stagger(phaseElapsed, dot.rank * GLOBE_STAGGER_MS, GLOBE_DOT_DUR_MS, fade, reduced);
    if (p <= 0) continue;

    const x = cosYaw * dot.x + sinYaw * dot.z;
    const z0 = -sinYaw * dot.x + cosYaw * dot.z;
    const y = cosPitch * dot.y - sinPitch * z0;
    const z = sinPitch * dot.y + cosPitch * z0;

    dots.push({
      px: cx + x * radius,
      py: cy - y * radius,
      z,
      theta: dot.theta,
      nx: x,
      ny: y,
      nz: z,
      p,
    });
  }

  dots.sort((a, b) => a.z - b.z);

  for (const dot of dots) {
    const nLen = Math.hypot(dot.nx, dot.ny, dot.nz) || 1;
    const facing = (dot.nx * lx + dot.ny * ly + dot.nz * lz) / (lLen * nLen);
    const wave = Math.sin(dot.theta * 2.8 - time * 1.6) * 0.28;
    const glowWave = Math.sin(dot.theta * 1.4 + time * 2.1) * 0.15;
    const brightness = Math.min(1, 0.18 + Math.max(0, facing) * 0.62 + wave + glowWave);
    const depth = (dot.z + 1) * 0.5;
    const size = (1.2 + depth * 2.2) * dot.p;
    const alpha = (0.12 + brightness * 0.75) * dot.p;

    ctx.fillStyle = light
      ? brightness > 0.52
        ? `rgba(29, 78, 216, ${alpha})`
        : `rgba(24, 24, 27, ${0.1 + brightness * 0.28 * dot.p})`
      : brightness > 0.52
        ? `rgba(96, 165, 250, ${alpha})`
        : `rgba(255, 255, 255, ${0.08 + brightness * 0.22 * dot.p})`;
    ctx.beginPath();
    ctx.arc(dot.px, dot.py, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function startLoadingCanvas(
  canvas: HTMLCanvasElement,
  root: HTMLElement,
  variant = pickLoadingVariant(),
): () => void {
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!ctx) return () => undefined;

  const visual = variant.visual ?? "lines";
  const { lines, holdMs, grid } = variant;
  const revealMs = visual === "globe" ? GLOBE_REVEAL_MS : variantRevealMs(variant);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = performance.now();
  let raf = 0;
  let w = 0;
  let h = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const frame = (now: number) => {
    if (!canvas.isConnected) return;

    const elapsed = now - start;
    ctx.clearRect(0, 0, w, h);
    const light = isLightScheme(root);

    if (visual === "globe") {
      const { t, fade, ambient } = cycle(elapsed, revealMs, holdMs);
      drawDotGlobe(ctx, w, h, elapsed, reduced, t, fade, reduced ? 1 : ambient, light);
    } else if (visual === "blobs") {
      const tide = variant.blobStyle === "tide";
      drawSoftBlobs(
        ctx,
        w,
        h,
        elapsed,
        reduced,
        tide ? TIDE : DIFFUSE,
        tide ? 58 : 52,
        tide ? 1800 : 1600,
        tide,
        light,
      );
    } else {
      const { t, fade } = cycle(elapsed, revealMs, holdMs);
      const gridA = reduced ? 1 : smooth(Math.min(1, elapsed / 1400)) * 0.7;

      drawGrid(
        ctx,
        cssVar(root, "--bk-grid-color", "rgba(255,255,255,0.03)"),
        w,
        h,
        gridA,
        grid.cols,
        grid.rows,
      );

      const lineColor = cssVar(root, "--bk-line-color", "rgba(255,255,255,0.08)");
      const lineAccent = cssVar(root, "--bk-line-accent", "rgba(255,255,255,0.15)");
      const lineBlue = cssVar(root, "--bk-line-blue", "rgba(96,165,250,0.4)");

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const p = stagger(t, line.delay, line.dur, fade, reduced);
        if (p <= 0) continue;

        ctx.strokeStyle = line.blue ? lineBlue : i % 2 ? lineColor : lineAccent;
        ctx.setLineDash(line.dashed ? [8, 11] : []);
        line.stroke(ctx, p, w, h);
      }
    }

    raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}
