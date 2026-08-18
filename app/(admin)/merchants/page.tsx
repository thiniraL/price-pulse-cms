'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import AdminModal from '@/components/AdminModal';
import Pagination from '@/components/Pagination';

type Merchant = {
  id: string;
  name: string;
  email: string;
  website: string | null;
  phone: string | null;
  contactName: string | null;
  supportsMintpay: boolean;
  supportsKokopay: boolean;
  sellingProbability: number | null;
  probabilityNote: string | null;
  campaignType: string | null;
  campaignStartDate: string | null;
  campaignEndDate: string | null;
  isActive: boolean;
  logoUrl: string | null;
};

const emptyForm = {
  name: '',
  email: '',
  website: '',
  phone: '',
  contactName: '',
  supportsMintpay: false,
  supportsKokopay: false,
  sellingProbability: '',
  probabilityNote: '',
  campaignType: '',
  campaignStartDate: '',
  campaignEndDate: '',
  isActive: true,
  logoUrl: '',
};

export default function MerchantsPage() {
  const [items, setItems] = useState<Merchant[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        data: Merchant[];
        total: number;
        totalPages: number;
      }>(`/api/merchants?${params}`);
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

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(m: Merchant) {
    setEditingId(m.id);
    setForm({
      name: m.name,
      email: m.email,
      website: m.website || '',
      phone: m.phone || '',
      contactName: m.contactName || '',
      supportsMintpay: m.supportsMintpay,
      supportsKokopay: m.supportsKokopay,
      sellingProbability:
        m.sellingProbability === null || m.sellingProbability === undefined
          ? ''
          : String(m.sellingProbability),
      probabilityNote: m.probabilityNote || '',
      campaignType: m.campaignType || '',
      campaignStartDate: m.campaignStartDate || '',
      campaignEndDate: m.campaignEndDate || '',
      isActive: m.isActive,
      logoUrl: m.logoUrl || '',
    });
    setShowForm(true);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      email: form.email,
      website: form.website || null,
      phone: form.phone || null,
      contactName: form.contactName || null,
      supportsMintpay: form.supportsMintpay,
      supportsKokopay: form.supportsKokopay,
      sellingProbability: form.sellingProbability
        ? Number(form.sellingProbability)
        : null,
      probabilityNote: form.probabilityNote || null,
      campaignType: form.campaignType || null,
      campaignStartDate: form.campaignStartDate || null,
      campaignEndDate: form.campaignEndDate || null,
      isActive: form.isActive,
      logoUrl: form.logoUrl || null,
    };

    try {
      if (editingId) {
        await apiFetch(`/api/merchants/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        const created = await apiFetch<{ data: Merchant }>('/api/merchants', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setEditingId(created.data.id);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(file: File) {
    if (!editingId) {
      setError('Save the merchant first, then upload a logo.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('entityType', 'merchant');
      body.append('entityId', editingId);
      body.append('replacePrevious', 'true');
      if (form.logoUrl) body.append('previousUrl', form.logoUrl);

      const res = await fetch('/api/images', {
        method: 'POST',
        credentials: 'include',
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setForm((f) => ({ ...f, logoUrl: data.data.url }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function clearLogo() {
    if (!editingId) return;
    setUploading(true);
    try {
      await apiFetch('/api/images', {
        method: 'DELETE',
        body: JSON.stringify({ merchantId: editingId, url: form.logoUrl }),
      });
      setForm((f) => ({ ...f, logoUrl: '' }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clear logo failed');
    } finally {
      setUploading(false);
    }
  }

  async function deactivate(id: string) {
    const m = items.find((x) => x.id === id);
    if (!m) return;
    try {
      await apiFetch(`/api/merchants/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: m.name,
          email: m.email,
          website: m.website,
          phone: m.phone,
          contactName: m.contactName,
          supportsMintpay: m.supportsMintpay,
          supportsKokopay: m.supportsKokopay,
          sellingProbability: m.sellingProbability,
          probabilityNote: m.probabilityNote,
          campaignType: m.campaignType,
          campaignStartDate: m.campaignStartDate,
          campaignEndDate: m.campaignEndDate,
          isActive: !m.isActive,
          logoUrl: m.logoUrl,
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Merchants</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Search, paginate, and manage merchants with S3 logos.
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={startCreate}>
          New merchant
        </button>
      </div>

      <div className="admin-card flex flex-wrap items-end gap-2">
        <label className="min-w-[220px] flex-1 text-sm">
          Search
          <input
            className="admin-input mt-1"
            placeholder="Name, email, or website"
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
          title={editingId ? 'Edit merchant' : 'Create merchant'}
          onClose={closeForm}
          wide
        >
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onSave}>
          <label className="block text-sm">
            Name
            <input
              className="admin-input mt-1"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Email
            <input
              className="admin-input mt-1"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Website
            <input
              className="admin-input mt-1"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Phone
            <input
              className="admin-input mt-1"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="block text-sm md:col-span-2">
            Contact name
            <input
              className="admin-input mt-1"
              value={form.contactName}
              onChange={(e) =>
                setForm({ ...form, contactName: e.target.value })
              }
            />
          </label>
          <div className="md:col-span-2 flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.supportsMintpay}
                onChange={(e) =>
                  setForm({ ...form, supportsMintpay: e.target.checked })
                }
              />
              Mintpay
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.supportsKokopay}
                onChange={(e) =>
                  setForm({ ...form, supportsKokopay: e.target.checked })
                }
              />
              Kokopay
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
              />
              Active
            </label>
          </div>
          <label className="block text-sm">
            Campaign type
            <input
              className="admin-input mt-1"
              value={form.campaignType}
              onChange={(e) =>
                setForm({ ...form, campaignType: e.target.value })
              }
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              Start
              <input
                className="admin-input mt-1"
                type="date"
                value={form.campaignStartDate}
                onChange={(e) =>
                  setForm({ ...form, campaignStartDate: e.target.value })
                }
              />
            </label>
            <label className="block text-sm">
              End
              <input
                className="admin-input mt-1"
                type="date"
                value={form.campaignEndDate}
                onChange={(e) =>
                  setForm({ ...form, campaignEndDate: e.target.value })
                }
              />
            </label>
          </div>
          <div className="md:col-span-2 rounded-lg border border-[var(--border)] p-3">
            <p className="text-sm font-medium">Logo</p>
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logoUrl}
                alt=""
                className="mt-2 h-16 w-16 rounded object-contain bg-slate-50"
              />
            ) : (
              <p className="mt-1 text-xs text-[var(--muted)]">No logo</p>
            )}
            <input
              className="mt-3 block w-full text-sm"
              type="file"
              accept="image/*"
              disabled={!editingId || uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
            />
            {editingId && form.logoUrl ? (
              <button
                type="button"
                className="admin-btn admin-btn-danger mt-2"
                disabled={uploading}
                onClick={clearLogo}
              >
                Remove logo
              </button>
            ) : null}
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={closeForm}
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
        <p className="text-sm text-[var(--muted)]">No merchants found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((m) => (
            <article key={m.id} className="admin-card flex flex-col gap-3">
              <div className="flex items-start gap-3">
                {m.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.logoUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg object-contain bg-slate-50"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-[var(--muted)]">
                    No logo
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold">{m.name}</h3>
                  <p className="truncate text-sm text-[var(--muted)]">{m.email}</p>
                  {m.website ? (
                    <p className="truncate text-xs text-[var(--muted)]">{m.website}</p>
                  ) : null}
                </div>
              </div>
              <span
                className={`w-fit rounded-full px-2 py-0.5 text-xs ${
                  m.isActive
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {m.isActive ? 'Active' : 'Inactive'}
              </span>
              <div className="mt-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => startEdit(m)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => deactivate(m.id)}
                >
                  {m.isActive ? 'Deactivate' : 'Activate'}
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
