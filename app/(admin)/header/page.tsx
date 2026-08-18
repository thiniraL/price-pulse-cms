'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import AdminModal from '@/components/AdminModal';
import Pagination from '@/components/Pagination';

type SubNav = {
  id: string;
  headerNavigationId: string;
  name: string;
  slug: string | null;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
};

type HeaderNav = {
  id: string;
  title: string;
  slug: string | null;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
  children: SubNav[];
};

const emptyNav = {
  title: '',
  slug: '',
  icon: '',
  displayOrder: 0,
  isActive: true,
};

const emptySub = {
  name: '',
  slug: '',
  icon: '',
  displayOrder: 0,
  isActive: true,
};

export default function HeaderPage() {
  const [items, setItems] = useState<HeaderNav[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyNav);
  const [subParentId, setSubParentId] = useState<string | null>(null);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subForm, setSubForm] = useState(emptySub);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '12',
      });
      if (q) params.set('q', q);
      const res = await apiFetch<{
        data: HeaderNav[];
        total: number;
        totalPages: number;
      }>(`/api/header?${params}`);
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    load();
  }, [load]);

  function closeNavForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyNav);
  }

  function closeSubForm() {
    setSubParentId(null);
    setEditingSubId(null);
    setSubForm(emptySub);
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyNav);
    setShowForm(true);
  }

  function startEdit(item: HeaderNav) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      slug: item.slug || '',
      icon: item.icon || '',
      displayOrder: item.displayOrder,
      isActive: item.isActive,
    });
    setShowForm(true);
  }

  async function saveNav(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      title: form.title,
      slug: form.slug || null,
      icon: form.icon || null,
      displayOrder: Number(form.displayOrder) || 0,
      isActive: form.isActive,
    };
    try {
      if (editingId) {
        await apiFetch(`/api/header/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/header', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyNav);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function deleteNav(id: string) {
    if (!confirm('Delete this header item and its sub-items?')) return;
    try {
      await apiFetch(`/api/header/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function startSubCreate(parentId: string) {
    setSubParentId(parentId);
    setEditingSubId(null);
    setSubForm(emptySub);
  }

  function startSubEdit(sub: SubNav) {
    setSubParentId(sub.headerNavigationId);
    setEditingSubId(sub.id);
    setSubForm({
      name: sub.name,
      slug: sub.slug || '',
      icon: sub.icon || '',
      displayOrder: sub.displayOrder,
      isActive: sub.isActive,
    });
  }

  async function saveSub(e: FormEvent) {
    e.preventDefault();
    if (!subParentId) return;
    setError(null);
    const payload = {
      headerNavigationId: subParentId,
      name: subForm.name,
      slug: subForm.slug || null,
      icon: subForm.icon || null,
      displayOrder: Number(subForm.displayOrder) || 0,
      isActive: subForm.isActive,
    };
    try {
      if (editingSubId) {
        await apiFetch(`/api/header/subs/${editingSubId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/header/subs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setSubParentId(null);
      setEditingSubId(null);
      setSubForm(emptySub);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sub-nav save failed');
    }
  }

  async function deleteSub(id: string) {
    if (!confirm('Delete this sub-navigation item?')) return;
    try {
      await apiFetch(`/api/header/subs/${id}`, { method: 'DELETE' });
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
            Header navigation
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Search and manage header items as cards.
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={startCreate}>
          New header item
        </button>
      </div>

      <div className="admin-card flex flex-wrap items-end gap-2">
        <label className="min-w-[220px] flex-1 text-sm">
          Search
          <input
            className="admin-input mt-1"
            placeholder="Title or slug"
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
        <AdminModal
          open={showForm}
          title={editingId ? 'Edit header item' : 'Create header item'}
          onClose={closeNavForm}
        >
          <form className="grid gap-3 md:grid-cols-2" onSubmit={saveNav}>
            <label className="block text-sm">
              Title
              <input
                className="admin-input mt-1"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Slug
              <input
                className="admin-input mt-1"
                placeholder="phones"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Icon
              <input
                className="admin-input mt-1"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
              />
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
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
              />
              Active
            </label>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="admin-btn admin-btn-primary">
                Save
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={closeNavForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {subParentId ? (
        <AdminModal
          open={Boolean(subParentId)}
          title={editingSubId ? 'Edit sub item' : 'Create sub item'}
          onClose={closeSubForm}
        >
          <form className="grid gap-3 md:grid-cols-2" onSubmit={saveSub}>
            <p className="md:col-span-2 text-xs text-[var(--muted)]">
              Parent: {items.find((i) => i.id === subParentId)?.title}
            </p>
            <label className="block text-sm">
              Name
              <input
                className="admin-input mt-1"
                required
                value={subForm.name}
                onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Slug
              <input
                className="admin-input mt-1"
                placeholder="apple or /phones?brand=Apple"
                value={subForm.slug}
                onChange={(e) => setSubForm({ ...subForm, slug: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Icon
              <input
                className="admin-input mt-1"
                value={subForm.icon}
                onChange={(e) => setSubForm({ ...subForm, icon: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Display order
              <input
                className="admin-input mt-1"
                type="number"
                value={subForm.displayOrder}
                onChange={(e) =>
                  setSubForm({
                    ...subForm,
                    displayOrder: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={subForm.isActive}
                onChange={(e) =>
                  setSubForm({ ...subForm, isActive: e.target.checked })
                }
              />
              Active
            </label>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="admin-btn admin-btn-primary">
                Save sub item
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={closeSubForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No header items found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="admin-card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-[var(--muted)]">
                    Order {item.displayOrder}
                  </p>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    {item.slug || 'No slug'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    item.isActive
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="rounded-lg bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Sub items ({item.children.length})
                </p>
                {item.children.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">None</p>
                ) : (
                  <ul className="space-y-2">
                    {item.children.map((sub) => (
                      <li
                        key={sub.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span>
                          {sub.displayOrder}. {sub.name}
                          {!sub.isActive ? ' (inactive)' : ''}
                          {sub.slug ? (
                            <span className="mt-0.5 block text-xs text-[var(--muted)]">
                              {sub.slug}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex gap-2">
                          <button
                            type="button"
                            className="text-xs font-semibold text-[var(--accent)]"
                            onClick={() => startSubEdit(sub)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-xs font-semibold text-[var(--danger)]"
                            onClick={() => deleteSub(sub.id)}
                          >
                            Delete
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="mt-3 text-xs font-semibold text-[var(--accent)]"
                  onClick={() => startSubCreate(item.id)}
                >
                  + Add sub
                </button>
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
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
                  onClick={() => deleteNav(item.id)}
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
