'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import Pagination from '@/components/Pagination';
import {
  FeedbackRow,
  formatFeedbackDate,
  truncateMessage,
} from '@/lib/feedback';

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });
      if (q) params.set('q', q);
      const res = await apiFetch<{
        data: FeedbackRow[];
        total: number;
        totalPages: number;
      }>(`/api/feedback?${params}`);
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    load();
  }, [load]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setQ(searchInput.trim());
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Feedback</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Review user feedback, optional contact details, and attached screenshots.
        </p>
      </div>

      <form onSubmit={onSearch} className="admin-card flex flex-wrap gap-2">
        <input
          className="admin-input min-w-[220px] flex-1"
          placeholder="Search message, email, product, merchant…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="admin-btn admin-btn-primary">
          Search
        </button>
        {q ? (
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => {
              setSearchInput('');
              setQ('');
              setPage(1);
            }}
          >
            Clear
          </button>
        ) : null}
      </form>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="admin-card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No feedback found.</p>
        ) : (
          <table className="admin-table table-fixed min-w-[900px]">
            <colgroup>
              <col className="w-[160px]" />
              <col />
              <col className="w-[180px]" />
              <col className="w-[180px]" />
              <col className="w-[110px]" />
              <col className="w-[88px]" />
            </colgroup>
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Message</th>
                <th>Email</th>
                <th>Product / Merchant</th>
                <th>Screenshots</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap text-sm text-[var(--muted)]">
                    {formatFeedbackDate(item.createdAt)}
                  </td>
                  <td className="overflow-hidden font-medium">
                    <div className="truncate" title={item.message}>
                      {truncateMessage(item.message)}
                    </div>
                  </td>
                  <td className="overflow-hidden">
                    <div className="truncate" title={item.email || undefined}>
                      {item.email || '—'}
                    </div>
                  </td>
                  <td className="overflow-hidden">
                    <div className="truncate" title={item.productName || undefined}>
                      {item.productName || '—'}
                    </div>
                    <div
                      className="truncate text-xs text-[var(--muted)]"
                      title={item.merchantName || undefined}
                    >
                      {item.merchantName || '—'}
                    </div>
                  </td>
                  <td>
                    {item.screenshotCount === 0 ? (
                      <span className="text-[var(--muted)]">0</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-2">
                          {item.screenshots.slice(0, 3).map((url, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={`${item.id}-thumb-${i}`}
                              src={url}
                              alt=""
                              className="h-8 w-8 rounded border border-white object-cover shadow-sm"
                            />
                          ))}
                        </div>
                        <span className="text-xs text-[var(--muted)]">
                          {item.screenshotCount}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/feedback/${item.id}`}
                      className="admin-btn admin-btn-secondary"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
