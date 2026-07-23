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

type Period = 'day' | 'month' | 'year' | 'custom';

type AnalyticsPayload = {
  period: Period;
  bucket: 'hour' | 'day' | 'month';
  from: string;
  to: string;
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

const PERIODS: Array<{ id: Period; label: string }> = [
  { id: 'day', label: 'Today' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
];

function formatBucketLabel(iso: string, bucket: AnalyticsPayload['bucket']) {
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

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState(defaultCustomRange().from);
  const [customTo, setCustomTo] = useState(defaultCustomRange().to);
  const [data, setData] = useState<AnalyticsPayload | null>(null);
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
      const res = await apiFetch<{ data: AnalyticsPayload }>(
        `/api/analytics/search?${params}`
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

  const seriesChart = useMemo(() => {
    if (!data) return [];
    return data.series.map((row) => ({
      ...row,
      name: formatBucketLabel(row.label, data.bucket),
    }));
  }, [data]);

  const topBarData = useMemo(() => {
    if (!data) return [];
    return data.topQueries.map((row) => ({
      name: row.query.length > 22 ? `${row.query.slice(0, 22)}…` : row.query,
      fullQuery: row.query,
      searches: row.searches,
    }));
  }, [data]);

  const zeroBarData = useMemo(() => {
    if (!data) return [];
    return data.zeroResultQueries.map((row) => ({
      name: row.query.length > 22 ? `${row.query.slice(0, 22)}…` : row.query,
      fullQuery: row.query,
      searches: row.searches,
    }));
  }, [data]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Search analytics</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Demand from <code className="text-xs">analytics.search_queries</code> —
            including zero-result searches (catalog gaps).
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
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total searches" value={data.summary.totalSearches} />
            <StatCard label="Unique queries" value={data.summary.uniqueQueries} />
            <StatCard
              label="Zero-result searches"
              value={data.summary.zeroResultSearches}
              hint={`${data.summary.zeroResultRate}% of searches`}
            />
            <StatCard
              label="With results"
              value={data.summary.withResultsSearches}
            />
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <section className="admin-card min-h-[320px]">
              <h3 className="text-base font-semibold">Searches over time</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Line chart — all searches vs zero-result searches
              </p>
              <div className="mt-4 h-[260px] w-full">
                {seriesChart.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={seriesChart}>
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
              </div>
            </section>

            <section className="admin-card min-h-[320px]">
              <h3 className="text-base font-semibold">By source</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Bar chart — autocomplete / submit / explore
              </p>
              <div className="mt-4 h-[260px] w-full">
                {data.bySource.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.bySource}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" />
                      <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="searches" name="Searches" fill="#0f6e56" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="admin-card min-h-[360px]">
              <h3 className="text-base font-semibold">Top queries</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Most searched terms in this period
              </p>
              <div className="mt-4 h-[280px] w-full">
                {topBarData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topBarData} layout="vertical" margin={{ left: 8, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value) => [value as number, 'Searches']}
                        labelFormatter={(_, payload) =>
                          (payload?.[0]?.payload as { fullQuery?: string })?.fullQuery ||
                          ''
                        }
                      />
                      <Bar dataKey="searches" fill="#1d4f91" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="admin-card min-h-[360px]">
              <h3 className="text-base font-semibold">Missing catalog (zero results)</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                What users searched that you do not have yet
              </p>
              <div className="mt-4 h-[280px] w-full">
                {zeroBarData.length === 0 ? (
                  <EmptyChart message="No zero-result queries in this period" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={zeroBarData} layout="vertical" margin={{ left: 8, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value) => [value as number, 'Searches']}
                        labelFormatter={(_, payload) =>
                          (payload?.[0]?.payload as { fullQuery?: string })?.fullQuery ||
                          ''
                        }
                      />
                      <Bar dataKey="searches" fill="#b42318" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>

          <section className="admin-card mt-4 overflow-x-auto">
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
                {data.topQueries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-[var(--muted)]">
                      No search data yet
                    </td>
                  </tr>
                ) : (
                  data.topQueries.map((row) => (
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
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="admin-card">
      <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {value.toLocaleString()}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
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
