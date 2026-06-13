export type HistoricalGradePoint = {
  date: Date;
  average: number;
};

export type ForecastPoint = {
  date: Date;
  value: number;
};

export type GradeForecastResult = {
  points: ForecastPoint[];
  projectedGrade: number;
  trendPerMonth: number;
  rSquared: number;
  methodLabel: string;
};

const MIN_POINTS = 3;
const MAX_MONTHS = 12;

function clampGrade(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** Holt's linear trend method (double exponential smoothing). */
function holtLinearForecast(
  values: number[],
  horizon: number,
  alpha = 0.38,
  beta = 0.14,
): number[] {
  if (values.length < 2) return [];

  let level = values[0];
  let trend = values[1] - values[0];

  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  return Array.from({ length: horizon }, (_, i) => level + (i + 1) * trend);
}

/** Weighted least squares with recency bias (exponential weights). */
function weightedLinearRegression(values: number[]): {
  forecasts: number[];
  slope: number;
  rSquared: number;
} {
  const n = values.length;
  if (n < 2) {
    return { forecasts: [], slope: 0, rSquared: 0 };
  }

  const decay = 0.72;
  const weights = values.map((_, i) => decay ** (n - 1 - i));
  const xs = values.map((_, i) => i);

  let sumW = 0;
  let sumWX = 0;
  let sumWY = 0;
  let sumWXX = 0;
  let sumWXY = 0;

  for (let i = 0; i < n; i++) {
    const w = weights[i];
    sumW += w;
    sumWX += w * xs[i];
    sumWY += w * values[i];
    sumWXX += w * xs[i] * xs[i];
    sumWXY += w * xs[i] * values[i];
  }

  const denom = sumW * sumWXX - sumWX * sumWX;
  const slope = denom === 0 ? 0 : (sumW * sumWXY - sumWX * sumWY) / denom;
  const intercept = (sumWY - slope * sumWX) / sumW;

  let ssRes = 0;
  let ssTot = 0;
  const meanY = sumWY / sumW;

  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * xs[i];
    ssRes += weights[i] * (values[i] - predicted) ** 2;
    ssTot += weights[i] * (values[i] - meanY) ** 2;
  }

  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  const forecasts = Array.from({ length: MAX_MONTHS }, (_, i) =>
    intercept + slope * (n - 1 + (i + 1)),
  );

  return { forecasts, slope, rSquared };
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** Collapse trend points to calendar months for stable forward projections. */
export function aggregateToMonthlyPoints(
  historical: HistoricalGradePoint[],
): HistoricalGradePoint[] {
  const buckets = new Map<string, number[]>();

  for (const point of historical) {
    const key = monthKey(point.date);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(point.average);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => ({
      date: new Date(`${key}-01`),
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
    }));
}

/**
 * Blend Holt-Winters-style smoothing with weighted regression, then damp
 * toward the recent mean so extreme projections stay realistic for grades.
 */
export function computeGradeForecast(
  historical: HistoricalGradePoint[],
  monthsForward: number,
): GradeForecastResult | null {
  const horizon = Math.min(MAX_MONTHS, Math.max(1, Math.round(monthsForward)));
  const sorted = [...historical]
    .filter((p) => Number.isFinite(p.average))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sorted.length < MIN_POINTS) return null;

  const values = sorted.map((p) => p.average);
  const holt = holtLinearForecast(values, horizon);
  const regression = weightedLinearRegression(values);
  const recentMean = values.slice(-3).reduce((sum, v) => sum + v, 0) / Math.min(3, values.length);

  const lastDate = sorted[sorted.length - 1].date;
  const points: ForecastPoint[] = [];

  for (let i = 0; i < horizon; i++) {
    const holtValue = holt[i] ?? regression.forecasts[i] ?? recentMean;
    const regValue = regression.forecasts[i] ?? holtValue;
    const blended = holtValue * 0.58 + regValue * 0.42;
    const damped = blended * 0.86 + recentMean * 0.14;

    points.push({
      date: addMonths(lastDate, i + 1),
      value: Math.round(clampGrade(damped) * 10) / 10,
    });
  }

  const projectedGrade = points[points.length - 1]?.value ?? recentMean;
  const trendPerMonth =
    points.length > 1
      ? (points[points.length - 1].value - values[values.length - 1]) / points.length
      : regression.slope;

  return {
    points,
    projectedGrade,
    trendPerMonth: Math.round(trendPerMonth * 10) / 10,
    rSquared: Math.round(regression.rSquared * 100) / 100,
    methodLabel: "Holt linear + weighted regression",
  };
}
