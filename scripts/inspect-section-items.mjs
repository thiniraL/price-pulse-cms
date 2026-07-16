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

async function cols(schema, table) {
  const r = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position`,
    [schema, table]
  );
  console.log(`\n${schema}.${table}`, r.rows.map((x) => x.column_name));
}

await cols('content', 'product_detail_blocks');
await cols('content', 'sponsored_products');
await cols('content', 'story_feed');
await cols('content', 'product_feature_collections');
await cols('content', 'ads_feed');

const sections = await pool.query(`
  SELECT "SectionTitle","ComponentKey","DataSourceKey","DataSourceTable"
  FROM content.page_sections WHERE lower("PageName")='home'
  ORDER BY "DisplayOrder"
`);
console.log('\nhome sections', sections.rows);

await pool.end();
