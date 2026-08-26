export type Line = {
  delay: number;
  dur: number;
  dashed?: boolean;
  blue?: boolean;
  stroke: (
    ctx: CanvasRenderingContext2D,
    p: number,
    w: number,
    h: number,
  ) => void;
};

export type LoadingVariant = {
  id: string;
  visual?: "lines" | "blobs" | "globe";
  blobStyle?: "diffuse" | "tide";
  holdMs: number;
  grid: { cols: number; rows: number };
  lines: Line[];
  theme: {
    background: string;
    vignetteOpacity: number;
    spinOuter: string;
    spinInner: string;
    spinSmall: string;
    stageName: string;
    stageDuration: string;
  };
};

const curve = (
  sample: (t: number, w: number, h: number) => { x: number; y: number },
): Line["stroke"] => {
  return (ctx, p, w, h) => {
    const steps = Math.max(24, Math.floor(140 * p));
    if (steps <= 1) return;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / 140) * p;
      const { x, y } = sample(Math.min(1, t), w, h);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
};

const segment = (x1: number, y1: number, x2: number, y2: number): Line["stroke"] => {
  return (ctx, p, w, h) => {
    const ax = x1 * w;
    const ay = y1 * h;
    const bx = x2 * w;
    const by = y2 * h;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + (bx - ax) * p, ay + (by - ay) * p);
    ctx.stroke();
  };
};

const BASE = "linear-gradient(180deg, #010101 0%, #040404 50%, #080808 100%)";
const BASE_LIGHT =
  "linear-gradient(180deg, #fafafa 0%, #f4f4f5 50%, #ececef 100%)";
const STAGE = "bkloading-stage-in";

function theme(
  background: string,
  vignetteOpacity: number,
  spinOuter: string,
  spinInner: string,
  spinSmall: string,
  stageDuration: string,
) {
  return {
    background,
    vignetteOpacity,
    spinOuter,
    spinInner,
    spinSmall,
    stageName: STAGE,
    stageDuration,
  };
}

function canvasVariant(
  id: string,
  visual: "blobs" | "globe",
  holdMs: number,
  t: ReturnType<typeof theme>,
  blobStyle?: "diffuse" | "tide",
): LoadingVariant {
  return {
    id,
    visual,
    blobStyle,
    holdMs,
    grid: { cols: 0, rows: 0 },
    lines: [],
    theme: t,
  };
}

export function resolveLoadingTheme(
  variant: LoadingVariant,
  darkMode: boolean,
): LoadingVariant["theme"] {
  if (darkMode) return variant.theme;
  return {
    ...variant.theme,
    background: variant.theme.background.replaceAll(BASE, BASE_LIGHT),
  };
}

const VARIANTS: LoadingVariant[] = [
  {
    id: "sweep",
    holdMs: 2200,
    grid: { cols: 10, rows: 6 },
    theme: theme(
      `radial-gradient(ellipse 70% 45% at 50% 95%, rgba(37, 99, 235, 0.12), transparent 62%), ${BASE}`,
      0.88,
      "1s",
      "3s",
      "3s",
      "0.85s",
    ),
    lines: [
      {
        delay: 0,
        dur: 1500,
        stroke: curve((t, w, h) => ({
          x: w * (0.06 + t * 0.78),
          y: h * (0.9 - Math.sin(t * Math.PI) * 0.55),
        })),
      },
      {
        delay: 100,
        dur: 1600,
        dashed: true,
        blue: true,
        stroke: curve((t, w, h) => {
          const a = Math.PI * 0.12 + t * Math.PI;
          return {
            x: w * 0.74 + Math.cos(a) * w * 0.34,
            y: h * 0.56 + Math.sin(a) * h * 0.42,
          };
        }),
      },
      {
        delay: 200,
        dur: 1400,
        dashed: true,
        stroke: curve((t, w, h) => {
          const a = Math.PI * 1.05 - t * Math.PI * 0.8;
          return {
            x: w * 0.28 + Math.cos(a) * w * 0.28,
            y: h * 0.34 + Math.sin(a) * h * 0.3,
          };
        }),
      },
      { delay: 60, dur: 900, stroke: segment(0.4, 0.1, 0.4, 0.94) },
      { delay: 160, dur: 1100, stroke: segment(0.04, 0.64, 0.96, 0.64) },
      {
        delay: 280,
        dur: 1700,
        stroke: curve((t, w, h) => ({
          x: w * (0.52 + t * 0.4),
          y: h * (0.14 + t * t * 0.7),
        })),
      },
      {
        delay: 240,
        dur: 900,
        dashed: true,
        blue: true,
        stroke: segment(0.1, 0.2, 0.5, 0.48),
      },
    ],
  },
  {
    id: "cross",
    holdMs: 2000,
    grid: { cols: 12, rows: 8 },
    theme: theme(
      `radial-gradient(ellipse 40% 30% at 80% 20%, rgba(59, 130, 246, 0.08), transparent 70%), ${BASE}`,
      0.9,
      "0.85s",
      "2.6s",
      "2.6s",
      "0.75s",
    ),
    lines: [
      { delay: 0, dur: 1200, stroke: segment(0.5, 0.06, 0.5, 0.94) },
      { delay: 80, dur: 1200, stroke: segment(0.04, 0.5, 0.96, 0.5) },
      {
        delay: 160,
        dur: 1000,
        dashed: true,
        blue: true,
        stroke: segment(0.08, 0.12, 0.92, 0.88),
      },
      {
        delay: 240,
        dur: 1000,
        dashed: true,
        stroke: segment(0.92, 0.12, 0.08, 0.88),
      },
      { delay: 320, dur: 900, stroke: segment(0.5, 0.06, 0.72, 0.28) },
      { delay: 400, dur: 900, stroke: segment(0.5, 0.94, 0.28, 0.72) },
    ],
  },
  canvasVariant(
    "diffuse",
    "blobs",
    0,
    theme(BASE, 0.78, "1.3s", "3.8s", "3.8s", "0.9s"),
    "diffuse",
  ),
  canvasVariant(
    "tide",
    "blobs",
    0,
    theme(
      `radial-gradient(ellipse 85% 45% at 50% 100%, rgba(37, 99, 235, 0.09), transparent 72%), ${BASE}`,
      0.8,
      "1.5s",
      "4.2s",
      "4.2s",
      "1s",
    ),
    "tide",
  ),
  canvasVariant(
    "globe",
    "globe",
    2500,
    theme(
      `radial-gradient(ellipse 55% 50% at 50% 48%, rgba(37, 99, 235, 0.1), transparent 70%), ${BASE}`,
      0.86,
      "1.2s",
      "3.5s",
      "3.5s",
      "0.9s",
    ),
  ),
];

export function listLoadingVariants(): LoadingVariant[] {
  return VARIANTS;
}

export function getLoadingVariant(id: string): LoadingVariant | undefined {
  return VARIANTS.find((v) => v.id === id);
}

export function pickLoadingVariant(): LoadingVariant {
  return VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
}

export function variantRevealMs(variant: LoadingVariant): number {
  if (variant.lines.length === 0) return 0;
  return Math.max(...variant.lines.map((l) => l.delay + l.dur));
}
