/**
 * Lightweight trend / forecast helpers for analytics charts.
 * Uses ordinary least squares on recent buckets (not ML).
 */

export type SeriesPoint = { label: string; value: number };

export type ForecastResult = {
  method: 'linear-regression';
  sampleSize: number;
  slope: number;
  intercept: number;
  nextValue: number;
  nextValues: number[];
  trend: 'up' | 'down' | 'flat';
  changePct: number;
  confidenceNote: string;
};

function clampNonNegative(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/**
 * Fit y = a + b*x on points (x = 0..n-1) and project `horizon` steps ahead.
 */
export function linearForecast(
  values: number[],
  horizon = 3
): ForecastResult | null {
  const cleaned = values.map((v) => (Number.isFinite(v) ? Number(v) : 0));
  if (cleaned.length < 3) {
    return null;
  }

  const n = cleaned.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += cleaned[i];
    sumXY += i * cleaned[i];
    sumXX += i * i;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) {
    return null;
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const nextValues: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    nextValues.push(clampNonNegative(intercept + slope * (n - 1 + h)));
  }

  const recent = cleaned.slice(-Math.min(7, n));
  const older = cleaned.slice(0, Math.max(1, cleaned.length - recent.length));
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const changePct =
    olderAvg > 0
      ? Math.round(((recentAvg - olderAvg) / olderAvg) * 1000) / 10
      : recentAvg > 0
        ? 100
        : 0;

  let trend: ForecastResult['trend'] = 'flat';
  if (slope > 0.15 || changePct >= 8) trend = 'up';
  else if (slope < -0.15 || changePct <= -8) trend = 'down';

  return {
    method: 'linear-regression',
    sampleSize: n,
    slope: Math.round(slope * 1000) / 1000,
    intercept: Math.round(intercept * 100) / 100,
    nextValue: nextValues[0] ?? 0,
    nextValues,
    trend,
    changePct,
    confidenceNote:
      n < 7
        ? 'Low confidence — few data points'
        : 'Indicative only — linear trend on historical buckets',
  };
}

export function appendForecastSeries(
  series: Array<{ label: string; value: number }>,
  forecast: ForecastResult | null,
  bucket: 'hour' | 'day' | 'month'
) {
  if (!forecast || series.length === 0) {
    return series.map((p) => ({ ...p, forecast: null as number | null }));
  }

  const last = new Date(series[series.length - 1].label);
  const stepMs =
    bucket === 'hour'
      ? 60 * 60 * 1000
      : bucket === 'month'
        ? 30 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

  const withNull = series.map((p) => ({
    ...p,
    forecast: null as number | null,
  }));

  // Bridge: last actual also shown on forecast line for continuity
  withNull[withNull.length - 1] = {
    ...withNull[withNull.length - 1],
    forecast: withNull[withNull.length - 1].value,
  };

  forecast.nextValues.forEach((value, idx) => {
    const when = new Date(last.getTime() + stepMs * (idx + 1));
    withNull.push({
      label: when.toISOString(),
      value: 0,
      forecast: value,
    });
  });

  return withNull;
}
