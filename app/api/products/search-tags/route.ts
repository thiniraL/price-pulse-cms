import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { SUGGESTED_SEARCH_TAGS } from '@/lib/productMedia';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const result = await query(
    `SELECT DISTINCT tag
     FROM (
       SELECT jsonb_array_elements_text(search_tags) AS tag
       FROM products.products
       WHERE search_tags IS NOT NULL AND jsonb_typeof(search_tags) = 'array'
       UNION
       SELECT jsonb_array_elements_text(search_tags) AS tag
       FROM products.variants
       WHERE search_tags IS NOT NULL AND jsonb_typeof(search_tags) = 'array'
     ) tags
     WHERE tag IS NOT NULL AND btrim(tag) <> ''
     ORDER BY tag ASC
     LIMIT 200`
  );

  const fromDb = result.rows
    .map((row) => String((row as { tag: string }).tag).trim())
    .filter(Boolean);

  const tags = [...new Set([...SUGGESTED_SEARCH_TAGS, ...fromDb])];

  return NextResponse.json({ data: tags });
}
