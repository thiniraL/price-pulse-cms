'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import type { ForecastResult } from '@/lib/analyticsPredict';

type Period = 'day' | 'month' | 'year' | 'custom';
type Tab = 'overview' | 'searches' | 'views' | 'predictions';

type OverviewPayload = {
  period: Period;
  bucket: 'hour' | 'day' | 'month';
  from: string;
  to: string;
  tables: {
    search_queries: boolean;
    product_views: boolean;
    frequently_viewed_aggregates: boolean;
  };
  search: {
    summary: {
      totalSearches: number;
      uniqueQueries: number;
      zeroResultSearches: number;
      withResultsSearches: number;
      zeroResultRate: number;
    };
    series: Array<{ label: string; searches: number; zeroResults: number }>;
    topQueries: Array<{
      query: string;
      searches: number;
      avgResultCount: number;
      zeroShare: number;
    }>;
    zeroResultQueries: Array<{ query: string; searches: number }>;
    bySource: Array<{ source: string; searches: number }>;
  };
  views: {
    summary: {
      totalViews: number;
      uniqueProducts: number;
      uniqueSessions: number;
      uniqueUsers: number;
    };
    series: Array<{ label: string; views: number }>;
    topProducts: Array<{ productId: string; name: string; views: number }>;
  };
  frequentlyViewed: Array<{
    productId: string;
    name: string;
    viewCount: number;
    rankPosition: number;
  }>;
  predictions: {
    searches: ForecastResult | null;
    zeroResults: ForecastResult | null;
    views: ForecastResult | null;
    searchForecastSeries: Array<{
      label: string;
      value: number;
      forecast: number | null;
    }>;
    viewsForecastSeries: Array<{
      label: string;
      value: number;
      forecast: number | null;
    }>;
    catalogGaps: Array<{
      query: string;
      recentSearches: number;
      recommendation: string;
    }>;
  };
};

const PERIODS: Array<{ id: Period; label: string }> = [
  { id: 'day', label: 'Today' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
];

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'searches', label: 'Searches' },
  { id: 'views', label: 'Product views' },
  { id: 'predictions', label: 'Predictions' },
];

function formatBucketLabel(iso: string, bucket: OverviewPayload['bucket']) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (bucket === 'hour') {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    });
  }
  if (bucket === 'month') {
    return d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
  }
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric' });
}

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultCustomRange() {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 29);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

function shortLabel(text: string, max = 22) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [tab, setTab] = useState<Tab>('overview');
  const [customFrom, setCustomFrom] = useState(defaultCustomRange().from);
  const [customTo, setCustomTo] = useState(defaultCustomRange().to);
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period });
      if (period === 'custom') {
        params.set('from', customFrom);
        params.set('to', customTo);
      }
      const res = await apiFetch<{ data: OverviewPayload }>(
        `/api/analytics/overview?${params}`
      );
      setData(res.data);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  const searchLine = useMemo(() => {
    if (!data) return [];
    return data.search.series.map((row) => ({
      ...row,
      name: formatBucketLabel(row.label, data.bucket),
    }));
  }, [data]);

  const viewsLine = useMemo(() => {
    if (!data) return [];
    return data.views.series.map((row) => ({
      ...row,
      name: formatBucketLabel(row.label, data.bucket),
    }));
  }, [data]);

  const searchForecastChart = useMemo(() => {
    if (!data) return [];
    return data.predictions.searchForecastSeries.map((row) => ({
      name: formatBucketLabel(row.label, data.bucket),
      actual: row.forecast != null && row.value === 0 ? null : row.value || null,
      forecast: row.forecast,
    }));
  }, [data]);

  const viewsForecastChart = useMemo(() => {
    if (!data) return [];
    return data.predictions.viewsForecastSeries.map((row) => ({
      name: formatBucketLabel(row.label, data.bucket),
      actual: row.forecast != null && row.value === 0 ? null : row.value || null,
      forecast: row.forecast,
    }));
  }, [data]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Schema <code className="text-xs">analytics</code> — search_queries,
            product_views, frequently_viewed_aggregates. Any signed-in user can
            view (no Admin role required).
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={load}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`admin-btn ${
                period === p.id ? 'admin-btn-primary' : 'admin-btn-secondary'
              }`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">From</span>
              <input
                type="date"
                className="admin-input w-auto"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">To</span>
              <input
                type="date"
                className="admin-input w-auto"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === t.id
                ? 'bg-[var(--accent)] font-semibold text-white'
                : 'text-[var(--muted)] hover:bg-black/5'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-white px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {loading && !data ? (
        <p className="mt-8 text-sm text-[var(--muted)]">Loading analytics…</p>
      ) : data ? (
        <>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Range {new Date(data.from).toLocaleString()} →{' '}
            {new Date(data.to).toLocaleString()} · bucket: {data.bucket}
            {loading ? ' · refreshing…' : ''}
            {' · tables: '}
            {[
              data.tables.search_queries && 'search_queries',
              data.tables.product_views && 'product_views',
              data.tables.frequently_viewed_aggregates &&
                'frequently_viewed_aggregates',
            ]
              .filter(Boolean)
              .join(', ') || 'none found'}
          </p>

          {tab === 'overview' && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Searches"
                  value={data.search.summary.totalSearches}
                />
                <StatCard
                  label="Zero-result rate"
                  value={data.search.summary.zeroResultRate}
                  suffix="%"
                  hint={`${data.search.summary.zeroResultSearches} searches`}
                />
                <StatCard
                  label="Product views"
                  value={data.views.summary.totalViews}
                />
                <StatCard
                  label="Unique products viewed"
                  value={data.views.summary.uniqueProducts}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard
                  title="Searches vs zero results"
                  subtitle="Line — search_queries"
                >
                  {searchLine.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={searchLine}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="searches"
                          name="Searches"
                          stroke="#0f6e56"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="zeroResults"
                          name="Zero results"
                          stroke="#b42318"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard
                  title="Product views over time"
                  subtitle="Line — product_views"
                >
                  {viewsLine.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={viewsLine}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="views"
                          name="Views"
                          stroke="#1d4f91"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>
            </div>
          )}

          {tab === 'searches' && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Total searches"
                  value={data.search.summary.totalSearches}
                />
                <StatCard
                  label="Unique queries"
                  value={data.search.summary.uniqueQueries}
                />
                <StatCard
                  label="Zero-result"
                  value={data.search.summary.zeroResultSearches}
                />
                <StatCard
                  label="With results"
                  value={data.search.summary.withResultsSearches}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="By source" subtitle="Bar — autocomplete / submit / explore">
                  {data.search.bySource.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.search.bySource}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" />
                        <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar
                          dataKey="searches"
                          fill="#0f6e56"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard title="Top queries" subtitle="Horizontal bar">
                  {data.search.topQueries.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.search.topQueries.map((r) => ({
                          name: shortLabel(r.query),
                          full: r.query,
                          searches: r.searches,
                        }))}
                        layout="vertical"
                        margin={{ left: 8, right: 12 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={110}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          labelFormatter={(_, payload) =>
                            (payload?.[0]?.payload as { full?: string })?.full || ''
                          }
                        />
                        <Bar dataKey="searches" fill="#1d4f91" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard
                  title="Missing catalog (zero results)"
                  subtitle="Demand you do not have yet"
                >
                  {data.search.zeroResultQueries.length === 0 ? (
                    <EmptyChart message="No zero-result queries" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.search.zeroResultQueries.map((r) => ({
                          name: shortLabel(r.query),
                          full: r.query,
                          searches: r.searches,
                        }))}
                        layout="vertical"
                        margin={{ left: 8, right: 12 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={110}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          labelFormatter={(_, payload) =>
                            (payload?.[0]?.payload as { full?: string })?.full || ''
                          }
                        />
                        <Bar dataKey="searches" fill="#b42318" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>

              <section className="admin-card overflow-x-auto">
                <h3 className="text-base font-semibold">Top queries detail</h3>
                <table className="admin-table mt-3">
                  <thead>
                    <tr>
                      <th>Query</th>
                      <th>Searches</th>
                      <th>Avg results</th>
                      <th>Zero %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.search.topQueries.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-[var(--muted)]">
                          No search data yet
                        </td>
                      </tr>
                    ) : (
                      data.search.topQueries.map((row) => (
                        <tr key={row.query}>
                          <td className="font-medium">{row.query}</td>
                          <td>{row.searches}</td>
                          <td>{row.avgResultCount}</td>
                          <td>{row.zeroShare}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {tab === 'views' && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total views" value={data.views.summary.totalViews} />
                <StatCard
                  label="Unique products"
                  value={data.views.summary.uniqueProducts}
                />
                <StatCard
                  label="Unique sessions"
                  value={data.views.summary.uniqueSessions}
                />
                <StatCard
                  label="Logged-in users"
                  value={data.views.summary.uniqueUsers}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="Views over time" subtitle="product_views">
                  {viewsLine.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={viewsLine}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="views"
                          stroke="#1d4f91"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard
                  title="Top viewed (period)"
                  subtitle="From product_views"
                >
                  {data.views.topProducts.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.views.topProducts.map((r) => ({
                          name: shortLabel(r.name),
                          full: r.name,
                          views: r.views,
                        }))}
                        layout="vertical"
                        margin={{ left: 8, right: 12 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          labelFormatter={(_, payload) =>
                            (payload?.[0]?.payload as { full?: string })?.full || ''
                          }
                        />
                        <Bar dataKey="views" fill="#0f6e56" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard
                  title="Frequently viewed (aggregate ranks)"
                  subtitle="frequently_viewed_aggregates snapshot"
                >
                  {data.frequentlyViewed.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.frequentlyViewed.map((r) => ({
                          name: shortLabel(r.name),
                          full: r.name,
                          views: r.viewCount,
                        }))}
                        layout="vertical"
                        margin={{ left: 8, right: 12 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          labelFormatter={(_, payload) =>
                            (payload?.[0]?.payload as { full?: string })?.full || ''
                          }
                        />
                        <Bar dataKey="views" fill="#6b4f1d" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>
            </div>
          )}

          {tab === 'predictions' && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Simple linear-regression forecasts on recent buckets (not ML). Use
                as directional signals for staffing / scraping priority.
              </p>

              <div className="grid gap-3 md:grid-cols-3">
                <ForecastCard title="Next-period searches" forecast={data.predictions.searches} />
                <ForecastCard
                  title="Next-period zero-result searches"
                  forecast={data.predictions.zeroResults}
                />
                <ForecastCard title="Next-period product views" forecast={data.predictions.views} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard
                  title="Search volume forecast"
                  subtitle="Solid = actual · dashed = predicted"
                >
                  {searchForecastChart.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={searchForecastChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          name="Actual"
                          stroke="#0f6e56"
                          strokeWidth={2}
                          dot={false}
                          connectNulls={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="forecast"
                          name="Forecast"
                          stroke="#b45309"
                          strokeWidth={2}
                          strokeDasharray="6 4"
                          dot={false}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard
                  title="Views forecast"
                  subtitle="Solid = actual · dashed = predicted"
                >
                  {viewsForecastChart.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={viewsForecastChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          name="Actual"
                          stroke="#1d4f91"
                          strokeWidth={2}
                          dot={false}
                          connectNulls={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="forecast"
                          name="Forecast"
                          stroke="#b45309"
                          strokeWidth={2}
                          strokeDasharray="6 4"
                          dot={false}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>

              <section className="admin-card overflow-x-auto">
                <h3 className="text-base font-semibold">Catalog gap recommendations</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  From zero-result search_queries — products/shops to prioritize
                </p>
                <table className="admin-table mt-3">
                  <thead>
                    <tr>
                      <th>Query</th>
                      <th>Searches</th>
                      <th>Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.predictions.catalogGaps.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-[var(--muted)]">
                          No gap signals yet
                        </td>
                      </tr>
                    ) : (
                      data.predictions.catalogGaps.map((row) => (
                        <tr key={row.query}>
                          <td className="font-medium">{row.query}</td>
                          <td>{row.recentSearches}</td>
                          <td>{row.recommendation}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  suffix,
}: {
  label: string;
  value: number;
  hint?: string;
  suffix?: string;
}) {
  return (
    <div className="admin-card">
      <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {value.toLocaleString()}
        {suffix || ''}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-card min-h-[320px]">
      <h3 className="text-base font-semibold">{title}</h3>
      {subtitle ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p>
      ) : null}
      <div className="mt-4 h-[260px] w-full">{children}</div>
    </section>
  );
}

function ForecastCard({
  title,
  forecast,
}: {
  title: string;
  forecast: ForecastResult | null;
}) {
  if (!forecast) {
    return (
      <div className="admin-card">
        <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
          {title}
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Need at least 3 buckets to forecast
        </p>
      </div>
    );
  }

  const trendColor =
    forecast.trend === 'up'
      ? '#0f6e56'
      : forecast.trend === 'down'
        ? '#b42318'
        : 'var(--muted)';

  return (
    <div className="admin-card">
      <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {forecast.nextValue.toLocaleString()}
      </p>
      <p className="mt-1 text-sm" style={{ color: trendColor }}>
        Trend {forecast.trend} · {forecast.changePct > 0 ? '+' : ''}
        {forecast.changePct}% recent vs earlier
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">{forecast.confidenceNote}</p>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Next 3: {forecast.nextValues.join(' · ')}
      </p>
    </div>
  );
}

function EmptyChart({ message = 'No data for this period' }: { message?: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
      {message}
    </div>
  );
}
