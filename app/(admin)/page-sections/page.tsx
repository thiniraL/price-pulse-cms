'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Pagination from '@/components/Pagination';
import {
  ADS_POSITIONS,
  PAGE_NAMES,
  SECTION_STYLES,
} from '@/lib/constants';

type PageSection = {
  id: string;
  pageName: string;
  sectionTitle: string;
  componentKey: string;
  adsEnabled: boolean;
  adsPosition: string;
  dataSourceKey: string | null;
  dataSourceTable: string | null;
  exploreEnabled: boolean;
  exploreText: string | null;
  exploreUrl: string | null;
  displayOrder: number;
  itemCount: number | null;
};

const emptyForm = {
  pageName: 'home' as (typeof PAGE_NAMES)[number],
  sectionTitle: '',
  componentKey: 'HorizontalScrollProductCards' as (typeof SECTION_STYLES)[number],
  adsEnabled: false,
  adsPosition: 'None' as (typeof ADS_POSITIONS)[number],
  dataSourceKey: '',
  dataSourceTable: '',
  exploreEnabled: false,
  exploreText: '',
  exploreUrl: '',
  displayOrder: 1,
  itemCount: '',
};

export default function PageSectionsPage() {
  const [pageName, setPageName] =
    useState<(typeof PAGE_NAMES)[number]>('home');
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        pageName,
        page: String(page),
        pageSize: '12',
      });
      if (q) params.set('q', q);
      const res = await apiFetch<{
        data: PageSection[];
        total: number;
        totalPages: number;
      }>(`/api/page-sections?${params}`);
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [pageName, page, q]);

  useEffect(() => {
    load();
  }, [load]);

  function startCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, pageName });
    setShowForm(true);
  }

  function startEdit(item: PageSection) {
    setEditingId(item.id);
    setForm({
      pageName: item.pageName as (typeof PAGE_NAMES)[number],
      sectionTitle: item.sectionTitle,
      componentKey: item.componentKey as (typeof SECTION_STYLES)[number],
      adsEnabled: item.adsEnabled,
      adsPosition: item.adsPosition as (typeof ADS_POSITIONS)[number],
      dataSourceKey: item.dataSourceKey || '',
      dataSourceTable: item.dataSourceTable || '',
      exploreEnabled: item.exploreEnabled,
      exploreText: item.exploreText || '',
      exploreUrl: item.exploreUrl || '',
      displayOrder: item.displayOrder,
      itemCount:
        item.itemCount === null || item.itemCount === undefined
          ? ''
          : String(item.itemCount),
    });
    setShowForm(true);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      pageName: form.pageName,
      sectionTitle: form.sectionTitle,
      componentKey: form.componentKey,
      adsEnabled: form.adsEnabled,
      adsPosition: form.adsPosition,
      dataSourceKey: form.dataSourceKey || null,
      dataSourceTable: form.dataSourceTable || null,
      exploreEnabled: form.exploreEnabled,
      exploreText: form.exploreText || null,
      exploreUrl: form.exploreUrl || null,
      displayOrder: Number(form.displayOrder) || 1,
      itemCount: form.itemCount === '' ? null : Number(form.itemCount),
    };

    try {
      if (editingId) {
        await apiFetch(`/api/page-sections/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/page-sections', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this page section?')) return;
    try {
      await apiFetch(`/api/page-sections/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Page sections
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Search and manage sections. Open Manage items on a dedicated page.
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={startCreate}>
          New section
        </button>
      </div>

      <div className="admin-card flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Page
          <select
            className="admin-input mt-1"
            value={pageName}
            onChange={(e) => {
              setPage(1);
              setPageName(e.target.value as (typeof PAGE_NAMES)[number]);
            }}
          >
            {PAGE_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[220px] flex-1 text-sm">
          Search
          <input
            className="admin-input mt-1"
            placeholder="Title, component, data source…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                setQ(searchInput.trim());
              }
            }}
          />
        </label>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={() => {
            setPage(1);
            setQ(searchInput.trim());
          }}
        >
          Search
        </button>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <form className="admin-card grid gap-3 md:grid-cols-2" onSubmit={onSave}>
          <h3 className="md:col-span-2 text-lg font-semibold">
            {editingId ? 'Edit section' : 'Create section'}
          </h3>
          <label className="block text-sm">
            Page name
            <select
              className="admin-input mt-1"
              value={form.pageName}
              onChange={(e) =>
                setForm({
                  ...form,
                  pageName: e.target.value as (typeof PAGE_NAMES)[number],
                })
              }
            >
              {PAGE_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Section title
            <input
              className="admin-input mt-1"
              required
              value={form.sectionTitle}
              onChange={(e) =>
                setForm({ ...form, sectionTitle: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            Component key
            <select
              className="admin-input mt-1"
              value={form.componentKey}
              onChange={(e) =>
                setForm({
                  ...form,
                  componentKey: e.target.value as (typeof SECTION_STYLES)[number],
                })
              }
            >
              {SECTION_STYLES.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Display order
            <input
              className="admin-input mt-1"
              type="number"
              value={form.displayOrder}
              onChange={(e) =>
                setForm({ ...form, displayOrder: Number(e.target.value) })
              }
            />
          </label>
          <label className="block text-sm">
            Item count
            <input
              className="admin-input mt-1"
              type="number"
              value={form.itemCount}
              onChange={(e) => setForm({ ...form, itemCount: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Data source key
            <input
              className="admin-input mt-1"
              value={form.dataSourceKey}
              onChange={(e) =>
                setForm({ ...form, dataSourceKey: e.target.value })
              }
              placeholder="e.g. bestsellers"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            Data source table
            <select
              className="admin-input mt-1"
              value={form.dataSourceTable}
              onChange={(e) =>
                setForm({ ...form, dataSourceTable: e.target.value })
              }
            >
              <option value="">— none —</option>
              <option value="product_detail_blocks">product_detail_blocks</option>
              <option value="story_feed">story_feed</option>
              <option value="product_feature_collections">
                product_feature_collections
              </option>
              <option value="sponsored_products">sponsored_products</option>
              <option value="merchants.merchant_prices">
                merchants.merchant_prices
              </option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.exploreEnabled}
              onChange={(e) =>
                setForm({ ...form, exploreEnabled: e.target.checked })
              }
            />
            Explore enabled
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.adsEnabled}
              onChange={(e) =>
                setForm({ ...form, adsEnabled: e.target.checked })
              }
            />
            Ads enabled
          </label>
          <label className="block text-sm">
            Explore text
            <input
              className="admin-input mt-1"
              value={form.exploreText}
              onChange={(e) =>
                setForm({ ...form, exploreText: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            Explore URL
            <input
              className="admin-input mt-1"
              value={form.exploreUrl}
              onChange={(e) =>
                setForm({ ...form, exploreUrl: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            Ads position
            <select
              className="admin-input mt-1"
              value={form.adsPosition}
              onChange={(e) =>
                setForm({
                  ...form,
                  adsPosition: e.target.value as (typeof ADS_POSITIONS)[number],
                })
              }
            >
              {ADS_POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="admin-btn admin-btn-primary">
              Save section
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No sections found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="admin-card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                    Order {item.displayOrder}
                  </p>
                  <h3 className="text-lg font-semibold leading-snug">
                    {item.sectionTitle}
                  </h3>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    item.adsEnabled
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.adsEnabled ? `Ads · ${item.adsPosition}` : 'No ads'}
                </span>
              </div>
              <dl className="space-y-1 text-sm text-[var(--muted)]">
                <div>
                  <dt className="inline font-medium text-[var(--foreground)]">
                    Component:{' '}
                  </dt>
                  <dd className="inline break-all">{item.componentKey}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-[var(--foreground)]">
                    Source:{' '}
                  </dt>
                  <dd className="inline break-all">
                    {item.dataSourceTable || '—'}
                    {item.dataSourceKey ? ` · ${item.dataSourceKey}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-medium text-[var(--foreground)]">
                    Item limit:{' '}
                  </dt>
                  <dd className="inline">{item.itemCount ?? 'default'}</dd>
                </div>
              </dl>
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                <Link
                  href={`/page-sections/${item.id}/items`}
                  className="admin-btn admin-btn-primary"
                >
                  Manage items
                </Link>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => startEdit(item)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-danger"
                  onClick={() => onDelete(item.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
}
