'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import Pagination from '@/components/Pagination';

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  categoryName: string | null;
  brandName: string | null;
  updatedAt: string | null;
};

export default function ProductsPage() {
  const [items, setItems] = useState<ProductRow[]>([]);
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
        data: ProductRow[];
        total: number;
        totalPages: number;
      }>(`/api/products?${params}`);
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
        <h2 className="text-2xl font-semibold tracking-tight">Products</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Search products, then open Manage to edit variants and merchant prices.
        </p>
      </div>

      <form onSubmit={onSearch} className="admin-card flex flex-wrap gap-2">
        <input
          className="admin-input min-w-[220px] flex-1"
          placeholder="Search by name, slug, or model…"
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
          <p className="text-sm text-[var(--muted)]">No products found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Slug</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td>{p.brandName || '—'}</td>
                  <td>{p.categoryName || '—'}</td>
                  <td className="max-w-[180px] truncate text-[var(--muted)]">
                    {p.slug || '—'}
                  </td>
                  <td>
                    <span
                      className={
                        p.status === 'Active'
                          ? 'text-emerald-700'
                          : 'text-[var(--muted)]'
                      }
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/products/${p.id}`}
                      className="admin-btn admin-btn-secondary"
                    >
                      Manage
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
