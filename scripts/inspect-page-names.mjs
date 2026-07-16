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

const cols = await pool.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'content' AND table_name = 'page_sections'
  ORDER BY ordinal_position
`);
console.log('columns', cols.rows);

const names = await pool.query(`
  SELECT "PageName", count(*)::int AS c
  FROM content.page_sections
  GROUP BY 1
`);
console.log('pageNames', names.rows);

const sample = await pool.query(`
  SELECT *
  FROM content.page_sections
  LIMIT 2
`);
console.log('sample', sample.rows);

await pool.end();
