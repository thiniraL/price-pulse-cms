import { readFileSync } from 'fs';
import { Pool } from 'pg';

const text = readFileSync('.env', 'utf8');
for (const line of text.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  process.env[t.slice(0, i)] ||= t.slice(i + 1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sections = await pool.query(`
  SELECT "Id", "SectionTitle", "ComponentKey", "DataSourceKey", "DataSourceTable",
         "DisplayOrder", "ItemCount", "AdsEnabled"
  FROM content.page_sections
  WHERE lower("PageName") = 'home'
  ORDER BY "DisplayOrder"
`);
console.log('home sections:');
for (const r of sections.rows) {
  console.log(JSON.stringify(r));
}

const cols = await pool.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'merchants' AND table_name = 'merchant_prices'
  ORDER BY ordinal_position
`);
console.log('\nmerchant_prices columns:', cols.rows.map((x) => x.column_name));

const dropCols = await pool.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'products' AND table_name = 'price_drop_products'
  ORDER BY ordinal_position
`);
console.log('\nprice_drop_products columns:', dropCols.rows.map((x) => x.column_name));

const mpCount = await pool.query(`
  SELECT COUNT(*)::int AS c FROM merchants.merchant_prices
  WHERE "PriceDropPercent" IS NOT NULL AND "PriceDropPercent" >= 1
`);
console.log('\nmerchant_prices with PriceDropPercent>=1:', mpCount.rows[0]);

const sample = await pool.query(`
  SELECT "Id", "ProductId", "MerchantId", "Price", "OriginalPrice", "PriceDropPercent", "LastScrapedAt", "IsActive"
  FROM merchants.merchant_prices
  WHERE "PriceDropPercent" IS NOT NULL AND "PriceDropPercent" >= 1
  ORDER BY "PriceDropPercent" DESC
  LIMIT 5
`);
console.log('\nsample drops:', sample.rows);

const pdp = await pool.query(`SELECT COUNT(*)::int AS c FROM products.price_drop_products`);
console.log('\nprice_drop_products count:', pdp.rows[0]);

await pool.end();
