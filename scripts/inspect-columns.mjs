import { readFileSync } from 'fs';
import { Pool } from 'pg';

const text = readFileSync('.env.local', 'utf8');
for (const line of text.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const i = trimmed.indexOf('=');
  if (i === -1) continue;
  process.env[trimmed.slice(0, i)] ||= trimmed.slice(i + 1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function cols(schema, table) {
  const r = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schema, table]
  );
  console.log(schema + '.' + table, r.rows.map((x) => x.column_name));
}

await cols('content', 'header_navigations');
await cols('content', 'header_sub_navigations');
await cols('merchants', 'merchants');
await cols('content', 'ads_feed');

await pool.end();
