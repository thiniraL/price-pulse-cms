import { readFileSync } from 'fs';
import { Pool } from 'pg';

function loadEnvLocal() {
  try {
    const text = readFileSync('.env.local', 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const i = trimmed.indexOf('=');
      if (i === -1) continue;
      const key = trimmed.slice(0, i);
      const value = trimmed.slice(i + 1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

loadEnvLocal();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const home = await pool.query(
    'SELECT count(*)::int AS c FROM content.page_sections WHERE "PageName" = $1',
    ['Home']
  );
  const headers = await pool.query(
    'SELECT count(*)::int AS c FROM content.header_navigations'
  );
  const merchants = await pool.query(
    'SELECT count(*)::int AS c FROM merchants.merchants'
  );

  // Round-trip write/delete for a disposable merchant smoke row
  const tag = `SmokeTest_${Date.now()}@example.com`;
  const inserted = await pool.query(
    `INSERT INTO merchants.merchants ("Name", "Email", "IsActive")
     VALUES ($1, $2, false)
     RETURNING "Id", "Name", "Email"`,
    [`Smoke Merchant ${Date.now()}`, tag]
  );
  const id = inserted.rows[0].Id;
  await pool.query(
    `UPDATE merchants.merchants SET "Website" = $2, "UpdatedAt" = NOW() WHERE "Id" = $1`,
    [id, 'https://example.com/smoke']
  );
  const verify = await pool.query(
    `SELECT "Website" FROM merchants.merchants WHERE "Id" = $1`,
    [id]
  );
  await pool.query(`DELETE FROM merchants.merchants WHERE "Id" = $1`, [id]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        homeSections: home.rows[0].c,
        headers: headers.rows[0].c,
        merchants: merchants.rows[0].c,
        writeSmoke: {
          id,
          website: verify.rows[0].Website,
        },
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
