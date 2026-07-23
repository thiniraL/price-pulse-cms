export type Period = 'day' | 'month' | 'year' | 'custom';
export type Bucket = 'hour' | 'day' | 'month';

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfUtcMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfUtcYear(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolveAnalyticsRange(
  period: Period,
  fromParam: string | null,
  toParam: string | null
) {
  const now = new Date();
  let from: Date;
  let to: Date = now;
  let bucket: Bucket;

  if (period === 'day') {
    from = startOfUtcDay(now);
    bucket = 'hour';
  } else if (period === 'year') {
    from = startOfUtcYear(now);
    bucket = 'month';
  } else if (period === 'custom') {
    const customFrom = parseDateParam(fromParam);
    const customTo = parseDateParam(toParam);
    from = customFrom ? startOfUtcDay(customFrom) : startOfUtcMonth(now);
    to = customTo
      ? new Date(
          Date.UTC(
            customTo.getUTCFullYear(),
            customTo.getUTCMonth(),
            customTo.getUTCDate(),
            23,
            59,
            59,
            999
          )
        )
      : now;
    if (from > to) {
      const tmp = from;
      from = startOfUtcDay(to);
      to = new Date(
        Date.UTC(
          tmp.getUTCFullYear(),
          tmp.getUTCMonth(),
          tmp.getUTCDate(),
          23,
          59,
          59,
          999
        )
      );
    }
    const spanDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    bucket = spanDays <= 2 ? 'hour' : spanDays <= 92 ? 'day' : 'month';
  } else {
    from = startOfUtcMonth(now);
    bucket = 'day';
  }

  return { from, to, bucket, period };
}

export function parsePeriodParam(raw: string | null): Period {
  const value = (raw || 'month').toLowerCase();
  if (value === 'day' || value === 'month' || value === 'year' || value === 'custom') {
    return value;
  }
  return 'month';
}

export function truncSql(column: string, bucket: Bucket) {
  if (bucket === 'hour') return `date_trunc('hour', ${column})`;
  if (bucket === 'month') return `date_trunc('month', ${column})`;
  return `date_trunc('day', ${column})`;
}
