import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  appendForecastSeries,
  linearForecast,
} from '@/lib/analyticsPredict';
import {
  parsePeriodParam,
  resolveAnalyticsRange,
  truncSql,
} from '@/lib/analyticsPeriod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function tableExists(schema: string, table: string) {
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = $2
     ) AS exists`,
    [schema, table]
  );
  return Boolean(result.rows[0]?.exists);
}

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
    const [hasSearches, hasViews, hasFreq] = await Promise.all([
      tableExists('analytics', 'search_queries'),
      tableExists('analytics', 'product_views'),
      tableExists('analytics', 'frequently_viewed_aggregates'),
    ]);

    // --- Search queries ---
    let searchSummary = {
      totalSearches: 0,
      uniqueQueries: 0,
      zeroResultSearches: 0,
      withResultsSearches: 0,
      zeroResultRate: 0,
    };
    let searchSeries: Array<{
      label: string;
      searches: number;
      zeroResults: number;
    }> = [];
    let topQueries: Array<{
      query: string;
      searches: number;
      avgResultCount: number;
      zeroShare: number;
    }> = [];
    let zeroResultQueries: Array<{ query: string; searches: number }> = [];
    let bySource: Array<{ source: string; searches: number }> = [];

    if (hasSearches) {
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
      const s = summaryResult.rows[0];
      const totalSearches = Number(s?.total_searches || 0);
      const zeroResultSearches = Number(s?.zero_result_searches || 0);
      searchSummary = {
        totalSearches,
        uniqueQueries: Number(s?.unique_queries || 0),
        zeroResultSearches,
        withResultsSearches: Number(s?.with_results_searches || 0),
        zeroResultRate:
          totalSearches > 0
            ? Math.round((zeroResultSearches / totalSearches) * 1000) / 10
            : 0,
      };

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
      searchSeries = seriesResult.rows.map((r) => ({
        label: new Date(r.bucket).toISOString(),
        searches: Number(r.searches || 0),
        zeroResults: Number(r.zero_results || 0),
      }));

      const topResult = await query<{
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
      topQueries = topResult.rows.map((r) => ({
        query: r.query,
        searches: Number(r.searches || 0),
        avgResultCount: Number(r.avg_result_count || 0),
        zeroShare: Number(r.zero_share || 0),
      }));

      const zeroResult = await query<{ query: string; searches: number }>(
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
      zeroResultQueries = zeroResult.rows.map((r) => ({
        query: r.query,
        searches: Number(r.searches || 0),
      }));

      const sourceResult = await query<{ source: string; searches: number }>(
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
      bySource = sourceResult.rows.map((r) => ({
        source: r.source,
        searches: Number(r.searches || 0),
      }));
    }

    // --- Product views ---
    let viewSummary = {
      totalViews: 0,
      uniqueProducts: 0,
      uniqueSessions: 0,
      uniqueUsers: 0,
    };
    let viewSeries: Array<{ label: string; views: number }> = [];
    let topViewedProducts: Array<{
      productId: string;
      name: string;
      views: number;
    }> = [];

    if (hasViews) {
      const viewSum = await query<{
        total_views: number;
        unique_products: number;
        unique_sessions: number;
        unique_users: number;
      }>(
        `SELECT
           COUNT(*)::int AS total_views,
           COUNT(DISTINCT "ProductId")::int AS unique_products,
           COUNT(DISTINCT "SessionId") FILTER (WHERE "SessionId" IS NOT NULL)::int AS unique_sessions,
           COUNT(DISTINCT "UserId") FILTER (WHERE "UserId" IS NOT NULL)::int AS unique_users
         FROM analytics.product_views
         WHERE viewed_at >= $1::timestamptz
           AND viewed_at <= $2::timestamptz`,
        params
      );
      const v = viewSum.rows[0];
      viewSummary = {
        totalViews: Number(v?.total_views || 0),
        uniqueProducts: Number(v?.unique_products || 0),
        uniqueSessions: Number(v?.unique_sessions || 0),
        uniqueUsers: Number(v?.unique_users || 0),
      };

      const viewSeriesResult = await query<{ bucket: Date; views: number }>(
        `SELECT
           ${truncSql('viewed_at', bucket)} AS bucket,
           COUNT(*)::int AS views
         FROM analytics.product_views
         WHERE viewed_at >= $1::timestamptz
           AND viewed_at <= $2::timestamptz
         GROUP BY 1
         ORDER BY 1 ASC`,
        params
      );
      viewSeries = viewSeriesResult.rows.map((r) => ({
        label: new Date(r.bucket).toISOString(),
        views: Number(r.views || 0),
      }));

      const topProductsResult = await query<{
        product_id: string;
        name: string;
        views: number;
      }>(
        `SELECT
           pv."ProductId"::text AS product_id,
           COALESCE(p."Name", 'Unknown product') AS name,
           COUNT(*)::int AS views
         FROM analytics.product_views pv
         LEFT JOIN products.products p ON p."Id" = pv."ProductId"
         WHERE pv.viewed_at >= $1::timestamptz
           AND pv.viewed_at <= $2::timestamptz
         GROUP BY pv."ProductId", p."Name"
         ORDER BY views DESC
         LIMIT 15`,
        params
      );
      topViewedProducts = topProductsResult.rows.map((r) => ({
        productId: r.product_id,
        name: r.name,
        views: Number(r.views || 0),
      }));
    }

    // --- Frequently viewed aggregates (snapshot table) ---
    let frequentlyViewed: Array<{
      productId: string;
      name: string;
      viewCount: number;
      rankPosition: number;
    }> = [];

    if (hasFreq) {
      const freqResult = await query<{
        product_id: string;
        name: string;
        view_count: string | number;
        rank_position: number;
      }>(
        `SELECT
           f."ProductId"::text AS product_id,
           COALESCE(p."Name", 'Unknown product') AS name,
           f.view_count,
           f.rank_position
         FROM analytics.frequently_viewed_aggregates f
         LEFT JOIN products.products p ON p."Id" = f."ProductId"
         ORDER BY f.rank_position ASC
         LIMIT 15`
      );
      frequentlyViewed = freqResult.rows.map((r) => ({
        productId: r.product_id,
        name: r.name,
        viewCount: Number(r.view_count || 0),
        rankPosition: Number(r.rank_position || 0),
      }));
    }

    // --- Predictions (linear trend) ---
    const searchForecast = linearForecast(
      searchSeries.map((p) => p.searches),
      3
    );
    const zeroForecast = linearForecast(
      searchSeries.map((p) => p.zeroResults),
      3
    );
    const viewsForecast = linearForecast(
      viewSeries.map((p) => p.views),
      3
    );

    const searchForecastSeries = appendForecastSeries(
      searchSeries.map((p) => ({ label: p.label, value: p.searches })),
      searchForecast,
      bucket
    );
    const viewsForecastSeries = appendForecastSeries(
      viewSeries.map((p) => ({ label: p.label, value: p.views })),
      viewsForecast,
      bucket
    );

    // Rising zero-result demand = catalog gap predictions
    const risingGaps = zeroResultQueries
      .slice(0, 8)
      .map((q) => ({
        query: q.query,
        recentSearches: q.searches,
        recommendation:
          q.searches >= 5
            ? 'High demand — prioritize scraping / catalog add'
            : 'Watch — growing interest with no matches',
      }));

    return NextResponse.json({
      data: {
        period,
        bucket,
        from: from.toISOString(),
        to: to.toISOString(),
        tables: {
          search_queries: hasSearches,
          product_views: hasViews,
          frequently_viewed_aggregates: hasFreq,
        },
        search: {
          summary: searchSummary,
          series: searchSeries,
          topQueries,
          zeroResultQueries,
          bySource,
        },
        views: {
          summary: viewSummary,
          series: viewSeries,
          topProducts: topViewedProducts,
        },
        frequentlyViewed,
        predictions: {
          searches: searchForecast,
          zeroResults: zeroForecast,
          views: viewsForecast,
          searchForecastSeries,
          viewsForecastSeries,
          catalogGaps: risingGaps,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load analytics';
    console.error('Analytics overview error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
