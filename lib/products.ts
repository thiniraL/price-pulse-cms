export type ProductListItem = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  categoryId: string | null;
  categoryName: string | null;
  brandName: string | null;
  updatedAt: string | null;
};

export type ProductVariant = {
  id: string;
  productId: string;
  sku: string | null;
  barcode: string | null;
  attrsKey: string;
  attrsJson: string | null;
  isDefault: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  createdAt: string;
  updatedAt: string | null;
};

export type MerchantPriceRow = {
  id: string;
  merchantId: string;
  merchantName: string;
  productId: string;
  variantId: string | null;
  variantAttrsKey: string | null;
  productUrl: string | null;
  currencyCode: string | null;
  originalPrice: number | null;
  price: number | null;
  discountPercent: number | null;
  priceDropPercent: number | null;
  inStock: boolean;
  lastScrapedAt: string | null;
  scrapeSuccess: boolean;
  scrapeWeight: number | null;
  createdAt: string;
  updatedAt: string | null;
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  brandId: string;
  brandName: string | null;
  categoryId: string;
  categoryName: string | null;
  subcategoryId: string;
  subcategoryName: string | null;
  modelNumber: string | null;
  mfrSku: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
  variants: ProductVariant[];
  prices: MerchantPriceRow[];
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function mapProductListItem(row: Record<string, unknown>): ProductListItem {
  return {
    id: String(row.Id),
    name: String(row.Name),
    slug: (row.Slug as string) ?? null,
    status: String(row.Status ?? 'Active'),
    categoryId: row.CategoryId ? String(row.CategoryId) : null,
    categoryName: (row.CategoryName as string) ?? null,
    brandName: (row.BrandName as string) ?? null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export function mapVariant(row: Record<string, unknown>): ProductVariant {
  const attrsJson = row.attrs_json;
  return {
    id: String(row.Id),
    productId: String(row.ProductId),
    sku: (row.Sku as string) ?? null,
    barcode: (row.Barcode as string) ?? null,
    attrsKey: String(row.attrs_key ?? 'default'),
    attrsJson:
      attrsJson === null || attrsJson === undefined
        ? null
        : typeof attrsJson === 'string'
          ? attrsJson
          : JSON.stringify(attrsJson),
    isDefault: Boolean(row.is_default),
    minPrice: num(row.min_price),
    maxPrice: num(row.max_price),
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export function mapMerchantPrice(row: Record<string, unknown>): MerchantPriceRow {
  return {
    id: String(row.Id),
    merchantId: String(row.MerchantId),
    merchantName: String(row.MerchantName ?? ''),
    productId: String(row.ProductId),
    variantId: row.VariantId ? String(row.VariantId) : null,
    variantAttrsKey: (row.VariantAttrsKey as string) ?? null,
    productUrl: (row.ProductUrl as string) ?? null,
    currencyCode: (row.CurrencyCode as string) ?? null,
    originalPrice: num(row.OriginalPrice),
    price: num(row.Price),
    discountPercent: num(row.DiscountPercent),
    priceDropPercent: num(row.PriceDropPercent),
    inStock: row.InStock === null || row.InStock === undefined ? true : Boolean(row.InStock),
    lastScrapedAt: row.LastScrapedAt ? String(row.LastScrapedAt) : null,
    scrapeSuccess: Boolean(row.ScrapeSuccess),
    scrapeWeight: num(row.ScrapeWeight),
    createdAt: String(row.CreatedAt),
    updatedAt: row.UpdatedAt ? String(row.UpdatedAt) : null,
  };
}

export function mapProductDetail(
  row: Record<string, unknown>,
  variants: ProductVariant[],
  prices: MerchantPriceRow[]
): ProductDetail {
  return {
    id: String(row.Id),
    name: String(row.Name),
    slug: (row.Slug as string) ?? null,
    status: String(row.Status ?? 'Active'),
    brandId: String(row.BrandId),
    brandName: (row.BrandName as string) ?? null,
    categoryId: String(row.CategoryId),
    categoryName: (row.CategoryName as string) ?? null,
    subcategoryId: String(row.SubcategoryId),
    subcategoryName: (row.SubcategoryName as string) ?? null,
    modelNumber: (row.model_number as string) ?? null,
    mfrSku: (row.mfr_sku as string) ?? null,
    description: (row.Description as string) ?? null,
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    variants,
    prices,
  };
}

export const VARIANT_SELECT = `
  "Id", "ProductId", "Sku", "Barcode",
  attrs_key, attrs_json, is_default,
  min_price, max_price, created_at, updated_at
`;

export const PRICE_SELECT = `
  mp."Id", mp."MerchantId", m."Name" AS "MerchantName",
  mp."ProductId", mp."VariantId", v.attrs_key AS "VariantAttrsKey",
  mp."ProductUrl", mp."CurrencyCode",
  mp."OriginalPrice", mp."Price", mp."DiscountPercent", mp."PriceDropPercent",
  mp."InStock", mp."LastScrapedAt", mp."ScrapeSuccess", mp."ScrapeWeight",
  mp."CreatedAt", mp."UpdatedAt"
`;
