import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Period = 'day' | 'month' | 'year' | 'custom';
type Bucket = 'hour' | 'day' | 'month';

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

function resolveRange(period: Period, fromParam: string | null, toParam: string | null) {
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
        Date.UTC(tmp.getUTCFullYear(), tmp.getUTCMonth(), tmp.getUTCDate(), 23, 59, 59, 999)
      );
    }
    const spanMs = to.getTime() - from.getTime();
    const spanDays = spanMs / (1000 * 60 * 60 * 24);
    bucket = spanDays <= 2 ? 'hour' : spanDays <= 92 ? 'day' : 'month';
  } else {
    // default: month
    from = startOfUtcMonth(now);
    bucket = 'day';
  }

  return { from, to, bucket, period: period === 'custom' ? 'custom' : period };
}

function truncExpr(bucket: Bucket) {
  if (bucket === 'hour') return `date_trunc('hour', searched_at)`;
  if (bucket === 'month') return `date_trunc('month', searched_at)`;
  return `date_trunc('day', searched_at)`;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const sp = request.nextUrl.searchParams;
  const periodParam = (sp.get('period') || 'month').toLowerCase() as Period;
  const period: Period = ['day', 'month', 'year', 'custom'].includes(periodParam)
    ? periodParam
    : 'month';

  const { from, to, bucket } = resolveRange(
    period,
    sp.get('from'),
    sp.get('to')
  );

  const params = [from.toISOString(), to.toISOString()];

  try {
    const summaryResult = await query<{
      total_searches: number;
      unique_queries: number;
      zero_result_searches: number;
      with_results_searches: number;
    }>(
      `SELECT
         COUNT(*)::int AS total_searches,
         COUNT(DISTINCT normalized_query)::int AS unique_queries,
         COUNT(*) FILTER (WHERE result_count = 0)::int AS zero_result_searches,
         COUNT(*) FILTER (WHERE result_count > 0)::int AS with_results_searches
       FROM analytics.search_queries
       WHERE searched_at >= $1::timestamptz
         AND searched_at <= $2::timestamptz`,
      params
    );

    const summaryRow = summaryResult.rows[0] || {
      total_searches: 0,
      unique_queries: 0,
      zero_result_searches: 0,
      with_results_searches: 0,
    };

    const totalSearches = Number(summaryRow.total_searches || 0);
    const zeroResultSearches = Number(summaryRow.zero_result_searches || 0);

    const seriesResult = await query<{
      bucket: Date;
      searches: number;
      zero_results: number;
    }>(
      `SELECT
         ${truncExpr(bucket)} AS bucket,
         COUNT(*)::int AS searches,
         COUNT(*) FILTER (WHERE result_count = 0)::int AS zero_results
       FROM analytics.search_queries
       WHERE searched_at >= $1::timestamptz
         AND searched_at <= $2::timestamptz
       GROUP BY 1
       ORDER BY 1 ASC`,
      params
    );

    const topQueriesResult = await query<{
      query: string;
      searches: number;
      avg_result_count: number;
      zero_share: number;
    }>(
      `SELECT
         normalized_query AS query,
         COUNT(*)::int AS searches,
         ROUND(AVG(result_count)::numeric, 1)::float AS avg_result_count,
         ROUND(
           (COUNT(*) FILTER (WHERE result_count = 0)::numeric / NULLIF(COUNT(*), 0)) * 100,
           1
         )::float AS zero_share
       FROM analytics.search_queries
       WHERE searched_at >= $1::timestamptz
         AND searched_at <= $2::timestamptz
       GROUP BY normalized_query
       ORDER BY searches DESC
       LIMIT 15`,
      params
    );

    const zeroQueriesResult = await query<{
      query: string;
      searches: number;
    }>(
      `SELECT
         normalized_query AS query,
         COUNT(*)::int AS searches
       FROM analytics.search_queries
       WHERE searched_at >= $1::timestamptz
         AND searched_at <= $2::timestamptz
         AND result_count = 0
       GROUP BY normalized_query
       ORDER BY searches DESC
       LIMIT 15`,
      params
    );

    const bySourceResult = await query<{
      source: string;
      searches: number;
    }>(
      `SELECT
         COALESCE(source, 'unknown') AS source,
         COUNT(*)::int AS searches
       FROM analytics.search_queries
       WHERE searched_at >= $1::timestamptz
         AND searched_at <= $2::timestamptz
       GROUP BY 1
       ORDER BY searches DESC`,
      params
    );

    return NextResponse.json({
      data: {
        period,
        bucket,
        from: from.toISOString(),
        to: to.toISOString(),
        summary: {
          totalSearches,
          uniqueQueries: Number(summaryRow.unique_queries || 0),
          zeroResultSearches,
          withResultsSearches: Number(summaryRow.with_results_searches || 0),
          zeroResultRate:
            totalSearches > 0
              ? Math.round((zeroResultSearches / totalSearches) * 1000) / 10
              : 0,
        },
        series: seriesResult.rows.map((r) => ({
          label: new Date(r.bucket).toISOString(),
          searches: Number(r.searches || 0),
          zeroResults: Number(r.zero_results || 0),
        })),
        topQueries: topQueriesResult.rows.map((r) => ({
          query: r.query,
          searches: Number(r.searches || 0),
          avgResultCount: Number(r.avg_result_count || 0),
          zeroShare: Number(r.zero_share || 0),
        })),
        zeroResultQueries: zeroQueriesResult.rows.map((r) => ({
          query: r.query,
          searches: Number(r.searches || 0),
        })),
        bySource: bySourceResult.rows.map((r) => ({
          source: r.source,
          searches: Number(r.searches || 0),
        })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load analytics';
    // Table may not exist yet
    if (message.includes('search_queries') || message.includes('does not exist')) {
      return NextResponse.json(
        {
          error:
            'analytics.search_queries table not found. Run the search analytics migration first.',
        },
        { status: 503 }
      );
    }
    console.error('Search analytics error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
