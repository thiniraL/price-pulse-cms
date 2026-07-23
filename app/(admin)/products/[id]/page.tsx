'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { PRODUCT_STATUSES } from '@/lib/schemas';

type Variant = {
  id: string;
  sku: string | null;
  barcode: string | null;
  attrsKey: string;
  attrsJson: string | null;
  isDefault: boolean;
  minPrice: number | null;
  maxPrice: number | null;
};

type PriceRow = {
  id: string;
  merchantId: string;
  merchantName: string;
  variantId: string | null;
  variantAttrsKey: string | null;
  productUrl: string | null;
  currencyCode: string | null;
  originalPrice: number | null;
  price: number | null;
  inStock: boolean;
  lastScrapedAt: string | null;
  scrapeSuccess: boolean;
};

type ProductDetail = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  brandName: string | null;
  categoryName: string | null;
  subcategoryName: string | null;
  modelNumber: string | null;
  mfrSku: string | null;
  variants: Variant[];
  prices: PriceRow[];
};

type MerchantOption = {
  id: string;
  name: string;
};

const emptyVariantForm = {
  sku: '',
  barcode: '',
  attrsKey: 'default',
  attrsJson: '',
  isDefault: false,
};

const emptyPriceForm = {
  merchantId: '',
  variantId: '',
  price: '',
  originalPrice: '',
  inStock: true,
  productUrl: '',
  currencyCode: 'LKR',
};

function money(v: number | null | undefined) {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString('en-LK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function ProductManagePage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [merchants, setMerchants] = useState<MerchantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [basics, setBasics] = useState({
    name: '',
    slug: '',
    status: 'Active',
  });

  const [variantEditingId, setVariantEditingId] = useState<string | null>(null);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [variantForm, setVariantForm] = useState(emptyVariantForm);

  const [priceEditingId, setPriceEditingId] = useState<string | null>(null);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [priceForm, setPriceForm] = useState(emptyPriceForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const productRes = await apiFetch<{ data: ProductDetail }>(
        `/api/products/${productId}`
      );
      setProduct(productRes.data);
      setBasics({
        name: productRes.data.name,
        slug: productRes.data.slug || '',
        status: productRes.data.status || 'Active',
      });

      const allMerchants: MerchantOption[] = [];
      let merchantPage = 1;
      let merchantPages = 1;
      do {
        const merchantsRes = await apiFetch<{
          data: MerchantOption[];
          totalPages: number;
        }>(`/api/merchants?page=${merchantPage}&pageSize=50`);
        allMerchants.push(...merchantsRes.data);
        merchantPages = merchantsRes.totalPages;
        merchantPage += 1;
      } while (merchantPage <= merchantPages);

      setMerchants(
        allMerchants.sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const merchantOptions = useMemo(() => merchants, [merchants]);

  async function saveBasics(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: ProductDetail }>(
        `/api/products/${productId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: basics.name.trim(),
            slug: basics.slug.trim() || null,
            status: basics.status,
          }),
        }
      );
      setProduct(res.data);
      setBasics({
        name: res.data.name,
        slug: res.data.slug || '',
        status: res.data.status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function startCreateVariant() {
    setVariantEditingId(null);
    setVariantForm(emptyVariantForm);
    setShowVariantForm(true);
  }

  function startEditVariant(v: Variant) {
    setVariantEditingId(v.id);
    setVariantForm({
      sku: v.sku || '',
      barcode: v.barcode || '',
      attrsKey: v.attrsKey || 'default',
      attrsJson: v.attrsJson || '',
      isDefault: v.isDefault,
    });
    setShowVariantForm(true);
  }

  async function saveVariant(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        sku: variantForm.sku.trim() || null,
        barcode: variantForm.barcode.trim() || null,
        attrsKey: variantForm.attrsKey.trim() || 'default',
        attrsJson: variantForm.attrsJson.trim() || null,
        isDefault: variantForm.isDefault,
      };
      if (variantEditingId) {
        await apiFetch(`/api/products/${productId}/variants/${variantEditingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/api/products/${productId}/variants`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowVariantForm(false);
      setVariantEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Variant save failed');
    } finally {
      setSaving(false);
    }
  }

  function startCreatePrice() {
    setPriceEditingId(null);
    setPriceForm({
      ...emptyPriceForm,
      merchantId: merchants[0]?.id || '',
      variantId: product?.variants.find((v) => v.isDefault)?.id || '',
    });
    setShowPriceForm(true);
  }

  function startEditPrice(row: PriceRow) {
    setPriceEditingId(row.id);
    setPriceForm({
      merchantId: row.merchantId,
      variantId: row.variantId || '',
      price: row.price != null ? String(row.price) : '',
      originalPrice: row.originalPrice != null ? String(row.originalPrice) : '',
      inStock: row.inStock,
      productUrl: row.productUrl || '',
      currencyCode: row.currencyCode || 'LKR',
    });
    setShowPriceForm(true);
  }

  async function savePrice(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const shared = {
        price: priceForm.price === '' ? null : Number(priceForm.price),
        originalPrice:
          priceForm.originalPrice === '' ? null : Number(priceForm.originalPrice),
        inStock: priceForm.inStock,
        productUrl: priceForm.productUrl.trim() || null,
        currencyCode: priceForm.currencyCode.trim() || 'LKR',
      };

      if (priceEditingId) {
        await apiFetch(`/api/products/${productId}/prices/${priceEditingId}`, {
          method: 'PUT',
          body: JSON.stringify(shared),
        });
      } else {
        if (!priceForm.merchantId) {
          throw new Error('Select a merchant');
        }
        await apiFetch(`/api/products/${productId}/prices`, {
          method: 'POST',
          body: JSON.stringify({
            ...shared,
            merchantId: priceForm.merchantId,
            variantId: priceForm.variantId || null,
          }),
        });
      }
      setShowPriceForm(false);
      setPriceEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Price save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading product…</p>;
  }

  if (!product) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">{error || 'Product not found'}</p>
        <Link href="/products" className="admin-btn admin-btn-secondary">
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/products"
            className="text-sm text-[var(--muted)] hover:underline"
          >
            ← Products
          </Link>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {product.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {[product.brandName, product.categoryName, product.subcategoryName]
              .filter(Boolean)
              .join(' · ') || 'Product manager'}
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="admin-card space-y-4">
        <h3 className="text-lg font-semibold">Product basics</h3>
        <div className="grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-3">
          <p>
            Brand: <span className="text-[var(--fg)]">{product.brandName || '—'}</span>
          </p>
          <p>
            Category:{' '}
            <span className="text-[var(--fg)]">{product.categoryName || '—'}</span>
          </p>
          <p>
            Subcategory:{' '}
            <span className="text-[var(--fg)]">
              {product.subcategoryName || '—'}
            </span>
          </p>
          <p>
            Model:{' '}
            <span className="text-[var(--fg)]">{product.modelNumber || '—'}</span>
          </p>
          <p>
            Mfr SKU:{' '}
            <span className="text-[var(--fg)]">{product.mfrSku || '—'}</span>
          </p>
        </div>
        <form onSubmit={saveBasics} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-[var(--muted)]">Name</span>
            <input
              className="admin-input w-full"
              value={basics.name}
              onChange={(e) => setBasics((s) => ({ ...s, name: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Slug</span>
            <input
              className="admin-input w-full"
              value={basics.slug}
              onChange={(e) => setBasics((s) => ({ ...s, slug: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Status</span>
            <select
              className="admin-input w-full"
              value={basics.status}
              onChange={(e) =>
                setBasics((s) => ({ ...s, status: e.target.value }))
              }
            >
              {PRODUCT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save product'}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">
            Variants ({product.variants.length})
          </h3>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={startCreateVariant}
          >
            Add variant
          </button>
        </div>

        {showVariantForm ? (
          <form
            onSubmit={saveVariant}
            className="grid gap-3 rounded-lg border border-[var(--border)] p-3 sm:grid-cols-2"
          >
            <p className="sm:col-span-2 text-sm font-medium">
              {variantEditingId ? 'Edit variant' : 'New variant'}
            </p>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Attrs key</span>
              <input
                className="admin-input w-full"
                value={variantForm.attrsKey}
                onChange={(e) =>
                  setVariantForm((s) => ({ ...s, attrsKey: e.target.value }))
                }
                required
              />
            </label>
            <label className="flex items-center gap-2 text-sm pt-6">
              <input
                type="checkbox"
                checked={variantForm.isDefault}
                onChange={(e) =>
                  setVariantForm((s) => ({ ...s, isDefault: e.target.checked }))
                }
              />
              Default variant
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">SKU</span>
              <input
                className="admin-input w-full"
                value={variantForm.sku}
                onChange={(e) =>
                  setVariantForm((s) => ({ ...s, sku: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Barcode</span>
              <input
                className="admin-input w-full"
                value={variantForm.barcode}
                onChange={(e) =>
                  setVariantForm((s) => ({ ...s, barcode: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">
                Attrs JSON (optional)
              </span>
              <textarea
                className="admin-input min-h-[80px] w-full font-mono text-xs"
                value={variantForm.attrsJson}
                onChange={(e) =>
                  setVariantForm((s) => ({ ...s, attrsJson: e.target.value }))
                }
                placeholder='{"color":"Black"}'
              />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save variant'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => {
                  setShowVariantForm(false);
                  setVariantEditingId(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {product.variants.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No variants yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Attrs key</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Default</th>
                  <th>Min / Max</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {product.variants.map((v) => (
                  <tr key={v.id}>
                    <td className="font-medium">{v.attrsKey}</td>
                    <td>{v.sku || '—'}</td>
                    <td>{v.barcode || '—'}</td>
                    <td>{v.isDefault ? 'Yes' : '—'}</td>
                    <td>
                      {money(v.minPrice)} / {money(v.maxPrice)}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={() => startEditVariant(v)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">
            Merchant prices ({product.prices.length})
          </h3>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={startCreatePrice}
          >
            Add price
          </button>
        </div>

        {showPriceForm ? (
          <form
            onSubmit={savePrice}
            className="grid gap-3 rounded-lg border border-[var(--border)] p-3 sm:grid-cols-2"
          >
            <p className="sm:col-span-2 text-sm font-medium">
              {priceEditingId ? 'Edit price' : 'New merchant price'}
            </p>
            {!priceEditingId ? (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--muted)]">Merchant</span>
                  <select
                    className="admin-input w-full"
                    value={priceForm.merchantId}
                    onChange={(e) =>
                      setPriceForm((s) => ({ ...s, merchantId: e.target.value }))
                    }
                    required
                  >
                    <option value="">Select merchant…</option>
                    {merchantOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--muted)]">Variant</span>
                  <select
                    className="admin-input w-full"
                    value={priceForm.variantId}
                    onChange={(e) =>
                      setPriceForm((s) => ({ ...s, variantId: e.target.value }))
                    }
                  >
                    <option value="">No variant</option>
                    {product.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.attrsKey}
                        {v.isDefault ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <p className="sm:col-span-2 text-sm text-[var(--muted)]">
                Merchant and variant cannot be changed here — edit price fields
                only.
              </p>
            )}
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Price</span>
              <input
                className="admin-input w-full"
                type="number"
                step="0.01"
                value={priceForm.price}
                onChange={(e) =>
                  setPriceForm((s) => ({ ...s, price: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Original price</span>
              <input
                className="admin-input w-full"
                type="number"
                step="0.01"
                value={priceForm.originalPrice}
                onChange={(e) =>
                  setPriceForm((s) => ({ ...s, originalPrice: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Currency</span>
              <input
                className="admin-input w-full"
                value={priceForm.currencyCode}
                onChange={(e) =>
                  setPriceForm((s) => ({ ...s, currencyCode: e.target.value }))
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm pt-6">
              <input
                type="checkbox"
                checked={priceForm.inStock}
                onChange={(e) =>
                  setPriceForm((s) => ({ ...s, inStock: e.target.checked }))
                }
              />
              In stock
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Product URL</span>
              <input
                className="admin-input w-full"
                value={priceForm.productUrl}
                onChange={(e) =>
                  setPriceForm((s) => ({ ...s, productUrl: e.target.value }))
                }
              />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save price'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => {
                  setShowPriceForm(false);
                  setPriceEditingId(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {product.prices.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No merchant prices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>Variant</th>
                  <th>Price</th>
                  <th>Original</th>
                  <th>Stock</th>
                  <th>Currency</th>
                  <th>URL</th>
                  <th>Scraped</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {product.prices.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.merchantName}</td>
                    <td>{row.variantAttrsKey || '—'}</td>
                    <td>{money(row.price)}</td>
                    <td>{money(row.originalPrice)}</td>
                    <td>{row.inStock ? 'Yes' : 'No'}</td>
                    <td>{row.currencyCode || '—'}</td>
                    <td className="max-w-[160px] truncate">
                      {row.productUrl ? (
                        <a
                          href={row.productUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-700 hover:underline"
                        >
                          Link
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-xs text-[var(--muted)]">
                      {row.lastScrapedAt
                        ? new Date(row.lastScrapedAt).toLocaleString()
                        : '—'}
                      {row.scrapeSuccess ? '' : row.lastScrapedAt ? ' (fail)' : ''}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={() => startEditPrice(row)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
