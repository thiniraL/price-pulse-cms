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

type ProductVariantHit = {
  id: string;
  attrsKey: string;
  isDefault: boolean;
  searchTags: string[];
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
  const [editVariantId, setEditVariantId] = useState('');
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
  const [productVariants, setProductVariants] = useState<ProductVariantHit[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [loadingVariants, setLoadingVariants] = useState(false);

  const [merchants, setMerchants] = useState<MerchantHit[]>([]);
  const [merchantId, setMerchantId] = useState('');
  const [categories, setCategories] = useState<CategoryHit[]>([]);
  const [categoryId, setCategoryId] = useState('');

  const [storyImage, setStoryImage] = useState('');
  const [storyCta, setStoryCta] = useState('Shop now');
  const [storyUrl, setStoryUrl] = useState('');
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyIsActive, setStoryIsActive] = useState(true);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [editStoryMerchantId, setEditStoryMerchantId] = useState('');
  const [editStoryCta, setEditStoryCta] = useState('');
  const [editStoryUrl, setEditStoryUrl] = useState('');
  const [editStoryIsActive, setEditStoryIsActive] = useState(true);
  const [savingStoryId, setSavingStoryId] = useState<string | null>(null);

  const [adMerchantId, setAdMerchantId] = useState('');
  const [adClickUrl, setAdClickUrl] = useState('#');
  const [adTitle, setAdTitle] = useState('');
  const [adFile, setAdFile] = useState<File | null>(null);

  const [collectionTitle, setCollectionTitle] = useState('');
  const [collectionDisplayOrder, setCollectionDisplayOrder] = useState('');
  const [collectionProducts, setCollectionProducts] = useState<
    (ProductHit | null)[]
  >([null, null, null, null]);
  const [collectionSlot, setCollectionSlot] = useState(0);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(
    null
  );
  const [editCollectionTitle, setEditCollectionTitle] = useState('');
  const [editCollectionDisplayOrder, setEditCollectionDisplayOrder] =
    useState('1');
  const [editCollectionProducts, setEditCollectionProducts] = useState<
    (ProductHit | null)[]
  >([null, null, null, null]);
  const [editCollectionSlot, setEditCollectionSlot] = useState(0);
  const [savingCollectionId, setSavingCollectionId] = useState<string | null>(
    null
  );

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

  async function replaceStoryImage(
    itemId: string,
    previousUrl: string | null,
    file: File
  ) {
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

  function startEditStory(item: Record<string, unknown>) {
    setEditingStoryId(String(item.id));
    setEditStoryMerchantId(
      typeof item.merchantId === 'string' ? item.merchantId : ''
    );
    setEditStoryCta(typeof item.cta === 'string' ? item.cta : '');
    setEditStoryUrl(typeof item.storyUrl === 'string' ? item.storyUrl : '');
    setEditStoryIsActive(item.isActive !== false);
  }

  async function saveStoryRow(itemId: string) {
    if (!editStoryMerchantId || !editStoryCta.trim()) {
      setError('Merchant and CTA are required');
      return;
    }
    setSavingStoryId(itemId);
    setError(null);
    try {
      await apiFetch(`/api/page-sections/${sectionId}/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({
          merchantId: editStoryMerchantId,
          cta: editStoryCta.trim(),
          storyUrl: editStoryUrl.trim() || null,
          isActive: editStoryIsActive,
        }),
      });
      setEditingStoryId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingStoryId(null);
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

  function formatVariantLabel(variant: ProductVariantHit) {
    const tags =
      variant.searchTags.length > 0
        ? ` · tags: ${variant.searchTags.join(', ')}`
        : '';
    return `${variant.attrsKey || 'default'}${variant.isDefault ? ' (default)' : ''}${tags}`;
  }

  async function loadProductVariants(productId: string, preferVariantId?: string | null) {
    setLoadingVariants(true);
    try {
      const res = await apiFetch<{ data: ProductVariantHit[] }>(
        `/api/products/${productId}/variants`
      );
      const variants = Array.isArray(res.data) ? res.data : [];
      setProductVariants(variants);

      if (variants.length === 0) {
        setSelectedVariantId('');
        return;
      }

      const preferred = preferVariantId
        ? variants.find((variant) => variant.id === preferVariantId)
        : null;
      if (preferred) {
        setSelectedVariantId(preferred.id);
        return;
      }

      const defaultVariant =
        variants.find((variant) => variant.isDefault) || variants[0];
      setSelectedVariantId(defaultVariant?.id || '');
    } catch {
      setProductVariants([]);
      setSelectedVariantId('');
    } finally {
      setLoadingVariants(false);
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
          variantId: selectedVariantId || null,
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
      setProductVariants([]);
      setSelectedVariantId('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed');
    }
  }

  async function startEditProductDetail(item: Record<string, unknown>) {
    setEditingProductDetailId(String(item.id));
    setEditSponsored(Boolean(item.isSponsored));
    setEditSponsoredUrl(
      typeof item.sponsoredUrl === 'string' ? item.sponsoredUrl : ''
    );
    setEditMerchantId(
      typeof item.merchantId === 'string' ? item.merchantId : ''
    );
    const rowVariantId = typeof item.variantId === 'string' ? item.variantId : '';
    setEditVariantId(rowVariantId);
    setEditIsActive(item.isActive !== false);
    setEditDisplayOrder(String(item.displayOrder ?? 1));
    if (typeof item.productId === 'string') {
      await loadProductVariants(item.productId, rowVariantId || null);
    } else {
      setProductVariants([]);
      setSelectedVariantId('');
    }
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
          variantId: editVariantId || null,
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
            isActive: storyIsActive,
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
      setStoryIsActive(true);
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

  function productHitFromCollectionField(
    item: Record<string, unknown>,
    index: 1 | 2 | 3 | 4
  ): ProductHit | null {
    const productId = item[`productId${index}`];
    if (!productId) return null;
    const productName = item[`productName${index}`];
    return {
      id: String(productId),
      name: String(productName || productId),
      slug: null,
      categoryId: null,
      categoryName: null,
    };
  }

  function clearCollectionSlot(slot: number, isEdit: boolean) {
    if (isEdit) {
      const next = [...editCollectionProducts];
      next[slot] = null;
      setEditCollectionProducts(next);
      return;
    }
    const next = [...collectionProducts];
    next[slot] = null;
    setCollectionProducts(next);
  }

  function startEditCollection(item: Record<string, unknown>) {
    setEditingCollectionId(String(item.id));
    setEditCollectionTitle(String(item.title || ''));
    setEditCollectionDisplayOrder(String(item.displayOrder ?? 1));
    setEditCollectionProducts([
      productHitFromCollectionField(item, 1),
      productHitFromCollectionField(item, 2),
      productHitFromCollectionField(item, 3),
      productHitFromCollectionField(item, 4),
    ]);
    setEditCollectionSlot(0);
    setProductHits([]);
    setProductQuery('');
  }

  async function saveCollectionRow(itemId: string) {
    if (!editCollectionTitle.trim()) {
      setError('Collection title is required');
      return;
    }
    setSavingCollectionId(itemId);
    setError(null);
    try {
      const orderNum = Number(editCollectionDisplayOrder);
      await apiFetch(`/api/page-sections/${sectionId}/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editCollectionTitle.trim(),
          displayOrder:
            Number.isFinite(orderNum) && orderNum > 0 ? orderNum : 1,
          productId1: editCollectionProducts[0]?.id || null,
          productId2: editCollectionProducts[1]?.id || null,
          productId3: editCollectionProducts[2]?.id || null,
          productId4: editCollectionProducts[3]?.id || null,
        }),
      });
      setEditingCollectionId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingCollectionId(null);
    }
  }

  async function addCollection(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const orderNum = Number(collectionDisplayOrder);
      await apiFetch(`/api/page-sections/${sectionId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          title: collectionTitle,
          productId1: collectionProducts[0]?.id || null,
          productId2: collectionProducts[1]?.id || null,
          productId3: collectionProducts[2]?.id || null,
          productId4: collectionProducts[3]?.id || null,
          displayOrder:
            Number.isFinite(orderNum) && orderNum > 0
              ? orderNum
              : items.length + 1,
        }),
      });
      setCollectionTitle('');
      setCollectionDisplayOrder('');
      setCollectionProducts([null, null, null, null]);
      setProductQuery('');
      setProductHits([]);
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
      if (editingCollectionId) {
        const next = [...editCollectionProducts];
        next[editCollectionSlot] = p;
        setEditCollectionProducts(next);
      } else {
        const next = [...collectionProducts];
        next[collectionSlot] = p;
        setCollectionProducts(next);
      }
    } else {
      setSelectedProduct(p);
      if (mode === 'product_detail_blocks') {
        void loadProductVariants(p.id);
      }
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
                  <th>Story URL</th>
                  <th>Status</th>
                  <th>Replace image</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const image = String(item.image || '');
                  const id = String(item.id);
                  const editing = editingStoryId === id;
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
                      <td className="min-w-[140px]">
                        {editing ? (
                          <select
                            className="admin-input"
                            value={editStoryMerchantId}
                            onChange={(e) => setEditStoryMerchantId(e.target.value)}
                          >
                            <option value="">Select merchant…</option>
                            {merchants.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          String(item.merchantName || item.merchantId)
                        )}
                      </td>
                      <td className="min-w-[120px]">
                        {editing ? (
                          <input
                            className="admin-input"
                            value={editStoryCta}
                            onChange={(e) => setEditStoryCta(e.target.value)}
                          />
                        ) : (
                          String(item.cta)
                        )}
                      </td>
                      <td className="min-w-[180px]">
                        {editing ? (
                          <input
                            className="admin-input"
                            type="url"
                            placeholder="https://…"
                            value={editStoryUrl}
                            onChange={(e) => setEditStoryUrl(e.target.value)}
                          />
                        ) : (
                          <span className="break-all text-xs text-[var(--muted)]">
                            {String(item.storyUrl || '—')}
                          </span>
                        )}
                      </td>
                      <td>
                        {editing ? (
                          <select
                            className="admin-input"
                            value={editStoryIsActive ? 'active' : 'inactive'}
                            onChange={(e) =>
                              setEditStoryIsActive(e.target.value === 'active')
                            }
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        ) : item.isActive !== false ? (
                          <span className="text-[var(--accent)]">Active</span>
                        ) : (
                          <span className="text-[var(--muted)]">Inactive</span>
                        )}
                      </td>
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
                      <td className="space-x-2 whitespace-nowrap">
                        {editing ? (
                          <>
                            <button
                              type="button"
                              className="admin-btn admin-btn-primary"
                              disabled={savingStoryId === id}
                              onClick={() => saveStoryRow(id)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary"
                              onClick={() => setEditingStoryId(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            onClick={() => startEditStory(item)}
                          >
                            Edit
                          </button>
                        )}
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
                    <td colSpan={7} className="text-sm text-[var(--muted)]">
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
              Status
              <select
                className="admin-input mt-1"
                value={storyIsActive ? 'active' : 'inactive'}
                onChange={(e) => setStoryIsActive(e.target.value === 'active')}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
                    <th>Variant</th>
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
                      <td className="min-w-[220px]">
                        {editingProductDetailId === String(item.id) ? (
                          <select
                            className="admin-input"
                            value={editVariantId}
                            onChange={(e) => setEditVariantId(e.target.value)}
                          >
                            <option value="">No variant (product-level)</option>
                            {productVariants.map((variant) => (
                              <option key={variant.id} value={variant.id}>
                                {formatVariantLabel(variant)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">
                            {typeof item.variantAttrsKey === 'string'
                              ? `${item.variantAttrsKey}${item.variantIsDefault ? ' (default)' : ''}${
                                  Array.isArray(item.variantSearchTags) &&
                                  item.variantSearchTags.length > 0
                                    ? ` · tags: ${(item.variantSearchTags as string[]).join(', ')}`
                                    : ''
                                }`
                              : 'Product-level'}
                          </span>
                        )}
                      </td>
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
                            onClick={() => {
                              void startEditProductDetail(item);
                            }}
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
                      <td className="min-w-[70px]">
                        {editingCollectionId === String(item.id) ? (
                          <input
                            className="admin-input w-20"
                            type="number"
                            min={1}
                            value={editCollectionDisplayOrder}
                            onChange={(e) =>
                              setEditCollectionDisplayOrder(e.target.value)
                            }
                          />
                        ) : (
                          String(item.displayOrder)
                        )}
                      </td>
                      <td className="min-w-[160px]">
                        {editingCollectionId === String(item.id) ? (
                          <input
                            className="admin-input"
                            value={editCollectionTitle}
                            onChange={(e) =>
                              setEditCollectionTitle(e.target.value)
                            }
                          />
                        ) : (
                          String(item.title)
                        )}
                      </td>
                      <td className="min-w-[280px]">
                        {editingCollectionId === String(item.id) ? (
                          <div className="space-y-1">
                            {editCollectionProducts.map((product, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 text-xs"
                              >
                                <button
                                  type="button"
                                  className={`rounded px-2 py-0.5 ${
                                    editCollectionSlot === index
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                  onClick={() => setEditCollectionSlot(index)}
                                >
                                  {index + 1}
                                </button>
                                <span className="min-w-0 flex-1 truncate">
                                  {product?.name || '— empty —'}
                                </span>
                                {product ? (
                                  <button
                                    type="button"
                                    className="text-[var(--danger)]"
                                    onClick={() =>
                                      clearCollectionSlot(index, true)
                                    }
                                  >
                                    Remove
                                  </button>
                                ) : null}
                              </div>
                            ))}
                            <p className="text-[var(--muted)]">
                              Pick a slot, then search below to add a product.
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs">
                            {[
                              item.productName1,
                              item.productName2,
                              item.productName3,
                              item.productName4,
                            ]
                              .filter(Boolean)
                              .join(', ') || '—'}
                          </span>
                        )}
                      </td>
                      <td className="space-x-2 whitespace-nowrap">
                        {editingCollectionId === String(item.id) ? (
                          <>
                            <button
                              type="button"
                              className="admin-btn admin-btn-primary"
                              disabled={savingCollectionId === String(item.id)}
                              onClick={() => saveCollectionRow(String(item.id))}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary"
                              onClick={() => setEditingCollectionId(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            onClick={() => startEditCollection(item)}
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
                  {mode === 'sponsored_products' ? (
                    <>
                      <td>{String(item.displayOrder)}</td>
                      <td>{String(item.productName || item.productId)}</td>
                      <td>{String(item.merchantName || item.merchantId)}</td>
                      <td>{String(item.categoryName || item.categoryId)}</td>
                    </>
                  ) : null}
                  {mode !== 'product_detail_blocks' &&
                  mode !== 'product_feature_collections' ? (
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
            <>
              <p className="text-sm font-medium">
                {editingCollectionId
                  ? 'Edit collection products'
                  : 'Add collection products'}
              </p>
              <label className="block text-sm">
                Assign search result to slot
                <select
                  className="admin-input mt-1 max-w-xs"
                  value={
                    editingCollectionId ? editCollectionSlot : collectionSlot
                  }
                  onChange={(e) => {
                    const slot = Number(e.target.value);
                    if (editingCollectionId) {
                      setEditCollectionSlot(slot);
                    } else {
                      setCollectionSlot(slot);
                    }
                  }}
                >
                  <option value={0}>Product 1</option>
                  <option value={1}>Product 2</option>
                  <option value={2}>Product 3</option>
                  <option value={3}>Product 4</option>
                </select>
              </label>
            </>
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
          {mode === 'product_detail_blocks' && selectedProduct ? (
            <label className="block text-sm">
              Variant
              <select
                className="admin-input mt-1"
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                disabled={loadingVariants || productVariants.length === 0}
              >
                <option value="">No variant (product-level)</option>
                {productVariants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {formatVariantLabel(variant)}
                  </option>
                ))}
              </select>
              {loadingVariants ? (
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  Loading variants...
                </span>
              ) : null}
            </label>
          ) : null}
          {mode === 'product_feature_collections' ? (
            <div className="space-y-1 text-xs text-[var(--muted)]">
              <p className="font-medium text-[var(--foreground)]">
                {editingCollectionId ? 'Editing slots' : 'New collection slots'}
              </p>
              {(editingCollectionId
                ? editCollectionProducts
                : collectionProducts
              ).map((product, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span>
                    {index + 1}: {product?.name || '—'}
                  </span>
                  {product ? (
                    <button
                      type="button"
                      className="text-[var(--danger)]"
                      onClick={() =>
                        clearCollectionSlot(index, Boolean(editingCollectionId))
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
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

      {mode === 'product_feature_collections' && !editingCollectionId ? (
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
          <label className="block text-sm">
            Display order
            <input
              className="admin-input mt-1 w-28"
              type="number"
              min={1}
              placeholder={String(items.length + 1)}
              value={collectionDisplayOrder}
              onChange={(e) => setCollectionDisplayOrder(e.target.value)}
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
