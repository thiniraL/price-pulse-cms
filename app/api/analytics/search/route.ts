import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  parsePeriodParam,
  resolveAnalyticsRange,
  truncSql,
} from '@/lib/analyticsPeriod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const sp = request.nextUrl.searchParams;
  const period = parsePeriodParam(sp.get('period'));
  const { from, to, bucket } = resolveAnalyticsRange(
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
         COALESCE(SUM(search_count), 0)::int AS total_searches,
         COUNT(DISTINCT normalized_query)::int AS unique_queries,
         COALESCE(SUM(search_count) FILTER (WHERE result_count = 0), 0)::int AS zero_result_searches,
         COALESCE(SUM(search_count) FILTER (WHERE result_count > 0), 0)::int AS with_results_searches
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
         ${truncSql('searched_at', bucket)} AS bucket,
         COALESCE(SUM(search_count), 0)::int AS searches,
         COALESCE(SUM(search_count) FILTER (WHERE result_count = 0), 0)::int AS zero_results
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
         COALESCE(SUM(search_count), 0)::int AS searches,
         ROUND(AVG(result_count)::numeric, 1)::float AS avg_result_count,
         ROUND(
           (COALESCE(SUM(search_count) FILTER (WHERE result_count = 0), 0)::numeric
             / NULLIF(SUM(search_count), 0)) * 100,
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
         COALESCE(SUM(search_count), 0)::int AS searches
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
         COALESCE(SUM(search_count), 0)::int AS searches
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
