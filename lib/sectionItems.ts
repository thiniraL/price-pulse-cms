export type SectionItemMode =
  | 'product_detail_blocks'
  | 'story_feed'
  | 'product_feature_collections'
  | 'sponsored_products'
  | 'price_drops'
  | 'computed'
  | 'none';

export function resolveSectionItemMode(
  dataSourceTable: string | null | undefined,
  dataSourceKey: string | null | undefined,
  componentKey?: string | null
): SectionItemMode {
  const table = (dataSourceTable || '').toLowerCase();
  const key = (dataSourceKey || '').toLowerCase();
  const component = (componentKey || '').toLowerCase();

  if (
    key === 'data_from_backend_best_price_drops' ||
    component === 'pricedropssection' ||
    table.includes('merchant_prices')
  ) {
    return 'price_drops';
  }

  if (key.startsWith('data_from_backend')) return 'computed';
  if (table.includes('story_feed')) return 'story_feed';
  if (table.includes('product_detail_blocks')) return 'product_detail_blocks';
  if (table.includes('product_feature_collections')) {
    return 'product_feature_collections';
  }
  if (table.includes('sponsored_products')) return 'sponsored_products';
  return 'none';
}

export function normalizeTableName(table: string | null | undefined) {
  const t = (table || '').trim();
  if (!t) return null;
  if (t.includes('.')) return t;
  // Home data often stores short names like "product_detail_blocks"
  if (
    t === 'product_detail_blocks' ||
    t === 'story_feed' ||
    t === 'product_feature_collections' ||
    t === 'sponsored_products' ||
    t === 'ads_feed' ||
    t === 'category_trending_blocks'
  ) {
    return `content.${t}`;
  }
  return t;
}
