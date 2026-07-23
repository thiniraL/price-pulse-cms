'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { SectionItemMode } from '@/lib/sectionItems';

type ProductHit = {
  id: string;
  name: string;
  slug: string | null;
  categoryId: string | null;
  categoryName: string | null;
};

type MerchantHit = {
  id: string;
  name: string;
  logoUrl: string | null;
};

type CategoryHit = { id: string; name: string };

type AdItem = {
  id: string;
  merchantId: string;
  merchantName: string | null;
  adType: string;
  title: string | null;
  imageUrl: string | null;
  clickUrl: string;
  displayOrder: number;
  isActive: boolean;
};

type Props = {
  sectionId: string;
  sectionTitle: string;
  onClose: () => void;
  hideClose?: boolean;
};

async function uploadSectionImage(options: {
  file: File;
  entityType: 'story' | 'ads';
  entityId: string;
  sectionId: string;
  previousUrl?: string | null;
}) {
  const body = new FormData();
  body.append('file', options.file);
  body.append('entityType', options.entityType);
  body.append('entityId', options.entityId);
  body.append('sectionId', options.sectionId);
  body.append('replacePrevious', 'true');
  if (options.previousUrl) {
    body.append('previousUrl', options.previousUrl);
  }

  const res = await fetch('/api/images', {
    method: 'POST',
    credentials: 'include',
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Upload failed');
  }
  return data.data.url as string;
}

export default function SectionItemsPanel({
  sectionId,
  sectionTitle,
  onClose,
  hideClose = false,
}: Props) {
  const [mode, setMode] = useState<SectionItemMode>('none');
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [ads, setAds] = useState<AdItem[]>([]);
  const [productDetailSponsored, setProductDetailSponsored] = useState(false);
  const [productDetailSponsoredUrl, setProductDetailSponsoredUrl] = useState('');
  const [productDetailMerchantId, setProductDetailMerchantId] = useState('');
  const [productDetailIsActive, setProductDetailIsActive] = useState(true);
  const [productDetailDisplayOrder, setProductDetailDisplayOrder] = useState('');
  const [editingProductDetailId, setEditingProductDetailId] = useState<string | null>(null);
  const [editSponsored, setEditSponsored] = useState(false);
  const [editSponsoredUrl, setEditSponsoredUrl] = useState('');
  const [editMerchantId, setEditMerchantId] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editDisplayOrder, setEditDisplayOrder] = useState('1');
  const [savingProductDetailId, setSavingProductDetailId] = useState<string | null>(null);
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [totalEligible, setTotalEligible] = useState<number | null>(null);
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const [productQuery, setProductQuery] = useState('');
  const [productHits, setProductHits] = useState<ProductHit[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductHit | null>(
    null
  );

  const [merchants, setMerchants] = useState<MerchantHit[]>([]);
  const [merchantId, setMerchantId] = useState('');
  const [categories, setCategories] = useState<CategoryHit[]>([]);
  const [categoryId, setCategoryId] = useState('');

  const [storyImage, setStoryImage] = useState('');
  const [storyCta, setStoryCta] = useState('Shop now');
  const [storyUrl, setStoryUrl] = useState('');
  const [storyFile, setStoryFile] = useState<File | null>(null);

  const [adMerchantId, setAdMerchantId] = useState('');
  const [adClickUrl, setAdClickUrl] = useState('#');
  const [adTitle, setAdTitle] = useState('');
  const [adFile, setAdFile] = useState<File | null>(null);

  const [collectionTitle, setCollectionTitle] = useState('');
  const [collectionProducts, setCollectionProducts] = useState<
    (ProductHit | null)[]
  >([null, null, null, null]);
  const [collectionSlot, setCollectionSlot] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{
        mode: SectionItemMode;
        message?: string;
        data: Record<string, unknown>[];
        ads?: AdItem[];
        adsEnabled?: boolean;
        totalEligible?: number;
        itemCount?: number;
      }>(`/api/page-sections/${sectionId}/items`);
      setMode(res.mode);
      setMessage(res.message || null);
      setItems(res.data || []);
      setAds(res.ads || []);
      setAdsEnabled(Boolean(res.adsEnabled));
      setTotalEligible(
        typeof res.totalEligible === 'number' ? res.totalEligible : null
      );
      setItemCount(typeof res.itemCount === 'number' ? res.itemCount : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (
      mode === 'story_feed' ||
      mode === 'sponsored_products' ||
      mode === 'product_detail_blocks' ||
      adsEnabled
    ) {
      apiFetch<{ data: MerchantHit[] }>('/api/merchants?pageSize=200')
        .then((res) =>
          setMerchants(
            res.data.map((m) => ({
              id: m.id,
              name: m.name,
              logoUrl: (m as { logoUrl?: string | null }).logoUrl ?? null,
            }))
          )
        )
        .catch(() => undefined);
    }
    if (mode === 'sponsored_products') {
      apiFetch<{ data: CategoryHit[] }>('/api/categories')
        .then((res) => setCategories(res.data))
        .catch(() => undefined);
    }
  }, [mode, adsEnabled]);

  async function searchProducts(q: string) {
    setProductQuery(q);
    if (q.trim().length < 1) {
      setProductHits([]);
      return;
    }
    try {
      const res = await apiFetch<{ data: ProductHit[] }>(
        `/api/products/search?q=${encodeURIComponent(q)}`
      );
      setProductHits(res.data);
    } catch {
      setProductHits([]);
    }
  }

  async function replaceStoryImage(itemId: string, previousUrl: string, file: File) {
    setUploadingId(itemId);
    setError(null);
    try {
      await uploadSectionImage({
        file,
        entityType: 'story',
        entityId: itemId,
        sectionId,
        previousUrl,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploadingId(null);
    }
  }

  async function replaceAdImage(itemId: string, previousUrl: string | null, file: File) {
    setUploadingId(itemId);
    setError(null);
    try {
      await uploadSectionImage({
        file,
        entityType: 'ads',
        entityId: itemId,
        sectionId,
        previousUrl,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploadingId(null);
    }
  }

  async function addProductDetail(e: FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;
    setError(null);
    try {
      const orderNum = Number(productDetailDisplayOrder);
      await apiFetch(`/api/page-sections/${sectionId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProduct.id,
          displayOrder:
            Number.isFinite(orderNum) && orderNum > 0
              ? orderNum
              : items.length + 1,
          isActive: productDetailIsActive,
          isSponsored: productDetailSponsored,
          sponsoredUrl: productDetailSponsored
            ? productDetailSponsoredUrl.trim() || null
            : null,
          merchantId: productDetailMerchantId || null,
        }),
      });
      setSelectedProduct(null);
      setProductQuery('');
      setProductHits([]);
      setProductDetailSponsored(false);
      setProductDetailSponsoredUrl('');
      setProductDetailMerchantId('');
      setProductDetailIsActive(true);
      setProductDetailDisplayOrder('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed');
    }
  }

  function startEditProductDetail(item: Record<string, unknown>) {
    setEditingProductDetailId(String(item.id));
    setEditSponsored(Boolean(item.isSponsored));
    setEditSponsoredUrl(
      typeof item.sponsoredUrl === 'string' ? item.sponsoredUrl : ''
    );
    setEditMerchantId(
      typeof item.merchantId === 'string' ? item.merchantId : ''
    );
    setEditIsActive(item.isActive !== false);
    setEditDisplayOrder(String(item.displayOrder ?? 1));
  }

  async function saveProductDetailRow(itemId: string) {
    setSavingProductDetailId(itemId);
    setError(null);
    try {
      const orderNum = Number(editDisplayOrder);
      await apiFetch(`/api/page-sections/${sectionId}/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({
          isActive: editIsActive,
          displayOrder:
            Number.isFinite(orderNum) && orderNum > 0 ? orderNum : 1,
          isSponsored: editSponsored,
          sponsoredUrl: editSponsored ? editSponsoredUrl.trim() || null : null,
          merchantId: editMerchantId || null,
        }),
      });
      setEditingProductDetailId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingProductDetailId(null);
    }
  }

  async function addStory(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await apiFetch<{ data: { id: string } }>(
        `/api/page-sections/${sectionId}/items`,
        {
          method: 'POST',
          body: JSON.stringify({
            merchantId,
            image: storyImage || undefined,
            cta: storyCta,
            storyUrl: storyUrl || null,
          }),
        }
      );
      if (storyFile) {
        await uploadSectionImage({
          file: storyFile,
          entityType: 'story',
          entityId: created.data.id,
          sectionId,
          previousUrl: storyImage || null,
        });
      }
      setMerchantId('');
      setStoryImage('');
      setStoryCta('Shop now');
      setStoryUrl('');
      setStoryFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed');
    }
  }

  async function addAd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await apiFetch<{ data: { id: string } }>(
        `/api/page-sections/${sectionId}/items`,
        {
          method: 'POST',
          body: JSON.stringify({
            itemType: 'ads',
            merchantId: adMerchantId,
            clickUrl: adClickUrl || '#',
            title: adTitle || null,
            displayOrder: ads.length + 1,
          }),
        }
      );
      if (adFile) {
        await uploadSectionImage({
          file: adFile,
          entityType: 'ads',
          entityId: created.data.id,
          sectionId,
        });
      }
      setAdMerchantId('');
      setAdClickUrl('#');
      setAdTitle('');
      setAdFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add ad failed');
    }
  }

  async function addCollection(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch(`/api/page-sections/${sectionId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          title: collectionTitle,
          productId1: collectionProducts[0]?.id || null,
          productId2: collectionProducts[1]?.id || null,
          productId3: collectionProducts[2]?.id || null,
          productId4: collectionProducts[3]?.id || null,
          displayOrder: items.length + 1,
        }),
      });
      setCollectionTitle('');
      setCollectionProducts([null, null, null, null]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed');
    }
  }

  async function addSponsored(e: FormEvent) {
    e.preventDefault();
    if (!selectedProduct || !merchantId || !categoryId) {
      setError('Pick product, merchant, and category');
      return;
    }
    setError(null);
    try {
      await apiFetch(`/api/page-sections/${sectionId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProduct.id,
          merchantId,
          categoryId,
          displayOrder: items.length + 1,
        }),
      });
      setSelectedProduct(null);
      setProductQuery('');
      setMerchantId('');
      setCategoryId('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed');
    }
  }

  async function removeItem(itemId: string, type?: 'ads') {
    if (!confirm('Remove this item from the section?')) return;
    try {
      const qs = type === 'ads' ? '?type=ads' : '';
      await apiFetch(`/api/page-sections/${sectionId}/items/${itemId}${qs}`, {
        method: 'DELETE',
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function pickProduct(p: ProductHit) {
    if (mode === 'product_feature_collections') {
      const next = [...collectionProducts];
      next[collectionSlot] = p;
      setCollectionProducts(next);
    } else {
      setSelectedProduct(p);
      if (mode === 'sponsored_products' && p.categoryId) {
        setCategoryId(p.categoryId);
      }
    }
    setProductHits([]);
    setProductQuery(p.name);
  }

  return (
    <div className="admin-card mt-4 border-[var(--accent)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Section items</h3>
          <p className="text-sm text-[var(--muted)]">{sectionTitle}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Mode: {mode}
            {adsEnabled ? ' · Ads enabled' : ''}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Images upload to S3 folder{' '}
            <code>pagesection/{'{sectionId}'}/…</code>
          </p>
        </div>
        {!hideClose ? (
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Loading items…</p>
      ) : null}

      {message ? (
        <p className="mt-4 text-sm text-[var(--muted)]">{message}</p>
      ) : null}

      {/* Best price drops — live preview from merchant_prices */}
      {!loading && mode === 'price_drops' ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-3 text-sm">
            <p>
              <strong>Source:</strong> <code>merchants.merchant_prices</code>
            </p>
            <p>
              <strong>Rules:</strong> drop 1–50% vs OriginalPrice,
              LastScrapedAt within 7 days (same as home API; &gt;50% excluded)
            </p>
            <p>
              <strong>Showing:</strong> {items.length}
              {itemCount != null ? ` (ItemCount ${itemCount})` : ''}
              {totalEligible != null
                ? ` · ${totalEligible} eligible in DB`
                : ''}
            </p>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No eligible price drops right now. Check scrape data in
              merchant_prices.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <article key={String(item.id)} className="admin-card flex gap-3">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={String(item.thumbnailUrl)}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded object-contain bg-slate-50"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] text-[var(--muted)]">
                      No img
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="truncate font-semibold">
                      {String(item.productName || item.productId)}
                    </h4>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {String(item.merchantName || '—')}
                      {item.categoryName
                        ? ` · ${String(item.categoryName)}`
                        : ''}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="font-semibold text-[var(--accent)]">
                        {item.priceDropPercent != null
                          ? `${Number(item.priceDropPercent).toFixed(1)}%`
                          : '—'}
                      </span>
                      <span className="text-[var(--muted)]"> drop · </span>
                      {item.currentPrice != null
                        ? Number(item.currentPrice).toLocaleString()
                        : '—'}
                      {item.originalPrice != null ? (
                        <span className="text-[var(--muted)] line-through ml-1">
                          {Number(item.originalPrice).toLocaleString()}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Story feed — Image column */}
      {!loading && mode === 'story_feed' ? (
        <div className="mt-4 space-y-3">
          <h4 className="font-semibold">Stories (`story_feed.Image`)</h4>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Merchant</th>
                  <th>CTA</th>
                  <th>Replace image</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const image = String(item.image || '');
                  const id = String(item.id);
                  return (
                    <tr key={id}>
                      <td>
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image}
                            alt=""
                            className="h-16 w-12 rounded object-cover bg-slate-100"
                          />
                        ) : (
                          <span className="text-xs text-[var(--muted)]">No image</span>
                        )}
                      </td>
                      <td>{String(item.merchantName || item.merchantId)}</td>
                      <td>{String(item.cta)}</td>
                      <td>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingId === id}
                          className="block w-full max-w-[200px] text-xs"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) replaceStoryImage(id, image, file);
                          }}
                        />
                        {uploadingId === id ? (
                          <span className="text-xs text-[var(--muted)]">Uploading…</span>
                        ) : null}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          onClick={() => removeItem(id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-sm text-[var(--muted)]">
                      No stories yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <form className="space-y-3 rounded-lg border border-[var(--border)] p-3" onSubmit={addStory}>
            <p className="text-sm font-medium">Add merchant story</p>
            <label className="block text-sm">
              Merchant
              <select
                className="admin-input mt-1"
                required
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
              >
                <option value="">Select merchant…</option>
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Upload image (S3)
              <input
                className="mt-1 block w-full text-sm"
                type="file"
                accept="image/*"
                onChange={(e) => setStoryFile(e.target.files?.[0] || null)}
              />
            </label>
            <label className="block text-sm">
              Or paste image URL
              <input
                className="admin-input mt-1"
                value={storyImage}
                onChange={(e) => setStoryImage(e.target.value)}
                placeholder="https://… (optional if uploading)"
              />
            </label>
            <label className="block text-sm">
              CTA
              <input
                className="admin-input mt-1"
                value={storyCta}
                onChange={(e) => setStoryCta(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Story URL
              <input
                className="admin-input mt-1"
                value={storyUrl}
                onChange={(e) => setStoryUrl(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={!storyFile && !storyImage}
            >
              Add merchant story
            </button>
          </form>
        </div>
      ) : null}

      {/* Ads — ImageUrl column */}
      {!loading && (adsEnabled || ads.length > 0) ? (
        <div className="mt-6 space-y-3">
          <h4 className="font-semibold">Section ads (`ads_feed.ImageUrl`)</h4>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Merchant</th>
                  <th>Title</th>
                  <th>Replace image</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr key={ad.id}>
                    <td>
                      {ad.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ad.imageUrl}
                          alt=""
                          className="h-14 w-20 rounded object-cover bg-slate-100"
                        />
                      ) : (
                        <span className="text-xs text-[var(--muted)]">No image</span>
                      )}
                    </td>
                    <td>{ad.merchantName || ad.merchantId}</td>
                    <td>{ad.title || '—'}</td>
                    <td>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingId === ad.id}
                        className="block w-full max-w-[200px] text-xs"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) replaceAdImage(ad.id, ad.imageUrl, file);
                        }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        onClick={() => removeItem(ad.id, 'ads')}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {ads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-sm text-[var(--muted)]">
                      No ads for this section.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <form className="space-y-3 rounded-lg border border-[var(--border)] p-3" onSubmit={addAd}>
            <p className="text-sm font-medium">Add section ad</p>
            <label className="block text-sm">
              Merchant
              <select
                className="admin-input mt-1"
                required
                value={adMerchantId}
                onChange={(e) => setAdMerchantId(e.target.value)}
              >
                <option value="">Select merchant…</option>
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Title
              <input
                className="admin-input mt-1"
                value={adTitle}
                onChange={(e) => setAdTitle(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Click URL
              <input
                className="admin-input mt-1"
                value={adClickUrl}
                onChange={(e) => setAdClickUrl(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Upload image (S3)
              <input
                className="mt-1 block w-full text-sm"
                type="file"
                accept="image/*"
                onChange={(e) => setAdFile(e.target.files?.[0] || null)}
              />
            </label>
            <button type="submit" className="admin-btn admin-btn-primary">
              Add ad
            </button>
          </form>
        </div>
      ) : null}

      {/* Other modes (products) — existing table without images */}
      {!loading &&
      mode !== 'none' &&
      mode !== 'computed' &&
      mode !== 'story_feed' &&
      mode !== 'price_drops' ? (
        <div className="mt-4 overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                {mode === 'product_detail_blocks' ? (
                  <>
                    <th>Order</th>
                    <th>Product</th>
                    <th>Active</th>
                    <th>Sponsored</th>
                    <th>Sponsored URL</th>
                    <th>Merchant</th>
                    <th />
                  </>
                ) : null}
                {mode === 'product_feature_collections' ? (
                  <>
                    <th>Order</th>
                    <th>Title</th>
                    <th>Products</th>
                    <th />
                  </>
                ) : null}
                {mode === 'sponsored_products' ? (
                  <>
                    <th>Order</th>
                    <th>Product</th>
                    <th>Merchant</th>
                    <th>Category</th>
                    <th />
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={String(item.id)}>
                  {mode === 'product_detail_blocks' ? (
                    <>
                      <td className="min-w-[70px]">
                        {editingProductDetailId === String(item.id) ? (
                          <input
                            className="admin-input w-20"
                            type="number"
                            min={1}
                            value={editDisplayOrder}
                            onChange={(e) => setEditDisplayOrder(e.target.value)}
                          />
                        ) : (
                          String(item.displayOrder)
                        )}
                      </td>
                      <td>{String(item.productName || item.productId)}</td>
                      <td>
                        {editingProductDetailId === String(item.id) ? (
                          <select
                            className="admin-input"
                            value={editIsActive ? 'active' : 'inactive'}
                            onChange={(e) =>
                              setEditIsActive(e.target.value === 'active')
                            }
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        ) : item.isActive ? (
                          <span className="text-[var(--accent)]">Active</span>
                        ) : (
                          <span className="text-[var(--muted)]">Inactive</span>
                        )}
                      </td>
                      <td>
                        {editingProductDetailId === String(item.id) ? (
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={editSponsored}
                              onChange={(e) => setEditSponsored(e.target.checked)}
                            />
                            Sponsored
                          </label>
                        ) : item.isSponsored ? (
                          'Yes'
                        ) : (
                          'No'
                        )}
                      </td>
                      <td className="min-w-[180px]">
                        {editingProductDetailId === String(item.id) ? (
                          <input
                            className="admin-input"
                            type="url"
                            placeholder="https://…"
                            disabled={!editSponsored}
                            value={editSponsoredUrl}
                            onChange={(e) => setEditSponsoredUrl(e.target.value)}
                          />
                        ) : (
                          <span className="break-all text-xs text-[var(--muted)]">
                            {item.isSponsored
                              ? String(item.sponsoredUrl || '—')
                              : '—'}
                          </span>
                        )}
                      </td>
                      <td className="min-w-[160px]">
                        {editingProductDetailId === String(item.id) ? (
                          <select
                            className="admin-input"
                            value={editMerchantId}
                            onChange={(e) => setEditMerchantId(e.target.value)}
                          >
                            <option value="">No merchant</option>
                            {merchants.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm">
                            {String(item.merchantName || '—')}
                          </span>
                        )}
                      </td>
                      <td className="space-x-2 whitespace-nowrap">
                        {editingProductDetailId === String(item.id) ? (
                          <>
                            <button
                              type="button"
                              className="admin-btn admin-btn-primary"
                              disabled={savingProductDetailId === String(item.id)}
                              onClick={() =>
                                saveProductDetailRow(String(item.id))
                              }
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary"
                              onClick={() => setEditingProductDetailId(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            onClick={() => startEditProductDetail(item)}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          onClick={() => removeItem(String(item.id))}
                        >
                          Remove
                        </button>
                      </td>
                    </>
                  ) : null}
                  {mode === 'product_feature_collections' ? (
                    <>
                      <td>{String(item.displayOrder)}</td>
                      <td>{String(item.title)}</td>
                      <td className="text-xs">
                        {[
                          item.productName1,
                          item.productName2,
                          item.productName3,
                          item.productName4,
                        ]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </td>
                    </>
                  ) : null}
                  {mode === 'sponsored_products' ? (
                    <>
                      <td>{String(item.displayOrder)}</td>
                      <td>{String(item.productName || item.productId)}</td>
                      <td>{String(item.merchantName || item.merchantId)}</td>
                      <td>{String(item.categoryName || item.categoryId)}</td>
                    </>
                  ) : null}
                  {mode !== 'product_detail_blocks' ? (
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        onClick={() => removeItem(String(item.id))}
                      >
                        Remove
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-sm text-[var(--muted)]">
                    No items yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {(mode === 'product_detail_blocks' ||
        mode === 'sponsored_products' ||
        mode === 'product_feature_collections') && (
        <div className="mt-4 space-y-2">
          {mode === 'product_feature_collections' ? (
            <label className="block text-sm">
              Assign search result to slot
              <select
                className="admin-input mt-1 max-w-xs"
                value={collectionSlot}
                onChange={(e) => setCollectionSlot(Number(e.target.value))}
              >
                <option value={0}>Product 1</option>
                <option value={1}>Product 2</option>
                <option value={2}>Product 3</option>
                <option value={3}>Product 4</option>
              </select>
            </label>
          ) : null}
          <label className="block text-sm">
            Search products
            <input
              className="admin-input mt-1"
              value={productQuery}
              onChange={(e) => searchProducts(e.target.value)}
              placeholder="Type product name…"
            />
          </label>
          {productHits.length > 0 ? (
            <ul className="max-h-40 overflow-auto rounded-lg border border-[var(--border)] bg-white text-sm">
              {productHits.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-slate-50"
                    onClick={() => pickProduct(p)}
                  >
                    {p.name}
                    {p.categoryName ? (
                      <span className="text-[var(--muted)]">
                        {' '}
                        · {p.categoryName}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {mode !== 'product_feature_collections' && selectedProduct ? (
            <p className="text-sm">
              Selected: <strong>{selectedProduct.name}</strong>
            </p>
          ) : null}
          {mode === 'product_feature_collections' ? (
            <p className="text-xs text-[var(--muted)]">
              Slots:{' '}
              {collectionProducts
                .map((p, i) => `${i + 1}:${p?.name || '—'}`)
                .join(' · ')}
            </p>
          ) : null}
        </div>
      )}

      {mode === 'product_detail_blocks' ? (
        <form className="mt-3 space-y-3" onSubmit={addProductDetail}>
          <div className="flex flex-wrap gap-4">
            <label className="block text-sm">
              Status
              <select
                className="admin-input mt-1"
                value={productDetailIsActive ? 'active' : 'inactive'}
                onChange={(e) =>
                  setProductDetailIsActive(e.target.value === 'active')
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="block text-sm">
              Display order
              <input
                className="admin-input mt-1 w-28"
                type="number"
                min={1}
                placeholder={String(items.length + 1)}
                value={productDetailDisplayOrder}
                onChange={(e) => setProductDetailDisplayOrder(e.target.value)}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={productDetailSponsored}
              onChange={(e) => setProductDetailSponsored(e.target.checked)}
            />
            Sponsored
          </label>
          {productDetailSponsored ? (
            <label className="block text-sm">
              Sponsored link URL
              <input
                className="admin-input mt-1"
                type="url"
                placeholder="https://…"
                value={productDetailSponsoredUrl}
                onChange={(e) => setProductDetailSponsoredUrl(e.target.value)}
              />
            </label>
          ) : null}
          <label className="block text-sm">
            Merchant
            <select
              className="admin-input mt-1"
              value={productDetailMerchantId}
              onChange={(e) => setProductDetailMerchantId(e.target.value)}
            >
              <option value="">No merchant</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={!selectedProduct}
          >
            Add product to section
          </button>
        </form>
      ) : null}

      {mode === 'product_feature_collections' ? (
        <form className="mt-4 space-y-3" onSubmit={addCollection}>
          <label className="block text-sm">
            Collection title
            <input
              className="admin-input mt-1"
              required
              value={collectionTitle}
              onChange={(e) => setCollectionTitle(e.target.value)}
            />
          </label>
          <button type="submit" className="admin-btn admin-btn-primary">
            Add collection
          </button>
        </form>
      ) : null}

      {mode === 'sponsored_products' ? (
        <form className="mt-4 space-y-3" onSubmit={addSponsored}>
          <label className="block text-sm">
            Merchant
            <select
              className="admin-input mt-1"
              required
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
            >
              <option value="">Select merchant…</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Category
            <select
              className="admin-input mt-1"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={!selectedProduct}
          >
            Add sponsored product
          </button>
        </form>
      ) : null}
    </div>
  );
}
