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

const sevenDays = await pool.query(
  `
  SELECT COUNT(*)::int AS c
  FROM merchants.merchant_prices
  WHERE "PriceDropPercent" IS NOT NULL
    AND "PriceDropPercent" >= 1
    AND "LastScrapedAt" IS NOT NULL
    AND "LastScrapedAt" >= NOW() - $1::interval
    AND "Price" IS NOT NULL
    AND "Price" > 0
`,
  ['7 days']
);
console.log('eligible last 7 days:', sevenDays.rows[0]);

const sample = await pool.query(
  `
  SELECT mp."Id", p."Name" AS product_name, m."Name" AS merchant_name,
         mp."Price", mp."OriginalPrice", mp."PriceDropPercent", mp."LastScrapedAt"
  FROM merchants.merchant_prices mp
  JOIN products.products p ON p."Id" = mp."ProductId"
  JOIN merchants.merchants m ON m."Id" = mp."MerchantId"
  WHERE mp."PriceDropPercent" IS NOT NULL
    AND mp."PriceDropPercent" >= 1
    AND mp."LastScrapedAt" IS NOT NULL
    AND mp."LastScrapedAt" >= NOW() - $1::interval
    AND mp."Price" IS NOT NULL
    AND mp."Price" > 0
  ORDER BY mp."PriceDropPercent" DESC, mp."LastScrapedAt" DESC
  LIMIT 15
`,
  ['7 days']
);
console.log('top 15 for home:', sample.rows);

const maxScraped = await pool.query(`
  SELECT MAX("LastScrapedAt") AS max_scraped,
         COUNT(*) FILTER (WHERE "PriceDropPercent" >= 1)::int AS drops
  FROM merchants.merchant_prices
`);
console.log('max LastScrapedAt / drops:', maxScraped.rows[0]);

await pool.end();
