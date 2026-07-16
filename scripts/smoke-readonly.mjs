import { readFileSync } from 'fs';
import { Pool } from 'pg';

function loadEnvLocal() {
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
}

loadEnvLocal();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const home = await pool.query(
    'SELECT "Id", "SectionTitle", "ComponentKey", "DisplayOrder" FROM content.page_sections WHERE lower("PageName") = $1 ORDER BY "DisplayOrder" ASC LIMIT 5',
    ['home']
  );
  const headers = await pool.query(
    'SELECT "Id", "Title", "Slug", "DisplayOrder", "IsActive" FROM content.header_navigations ORDER BY "DisplayOrder" ASC LIMIT 5'
  );
  const merchants = await pool.query(
    'SELECT "Id", "Name", "Email", "IsActive", "LogoUrl" FROM merchants.merchants ORDER BY "Name" ASC LIMIT 5'
  );

  const apiBase = (process.env.API_BASE_URL || 'http://api.pricepulse.lk').replace(
    /\/$/,
    ''
  );
  const contentRes = await fetch(`${apiBase}/api/Content/Home`, {
    cache: 'no-store',
  });
  const contentOk = contentRes.ok;
  let sectionCount = null;
  if (contentOk) {
    const json = await contentRes.json();
    const data = json.data ?? json.Data ?? [];
    sectionCount = Array.isArray(data) ? data.length : null;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        db: {
          homeSectionSample: home.rows.length,
          headerSample: headers.rows.length,
          merchantSample: merchants.rows.length,
          firstHomeTitle: home.rows[0]?.SectionTitle ?? null,
          firstHeaderTitle: headers.rows[0]?.Title ?? null,
          firstMerchantName: merchants.rows[0]?.Name ?? null,
        },
        publicApi: {
          status: contentRes.status,
          contentOk,
          sectionCount,
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
