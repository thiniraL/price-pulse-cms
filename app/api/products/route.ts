import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { paginationMeta, parsePagination } from '@/lib/pagination';
import { mapProductListItem } from '@/lib/products';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  const { page, pageSize, offset } = parsePagination(request.nextUrl.searchParams, {
    pageSize: 20,
  });

  const params: unknown[] = [];
  let where = '';
  if (q) {
    params.push(`%${q}%`);
    where = `WHERE p."Name" ILIKE $1 OR COALESCE(p."Slug",'') ILIKE $1 OR COALESCE(p.model_number,'') ILIKE $1`;
  }

  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM products.products p
     ${where}`,
    params
  );
  const total = Number((countResult.rows[0] as { total: number }).total || 0);

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const result = await query(
    `SELECT p."Id", p."Name", p."Slug", p."Status", p."CategoryId",
            p."Images", p.search_tags, p.updated_at,
            c."Name" AS "CategoryName", b."Name" AS "BrandName"
     FROM products.products p
     LEFT JOIN products.categories c ON c."Id" = p."CategoryId"
     LEFT JOIN products.brands b ON b."Id" = p."BrandId"
     ${where}
     ORDER BY p."Name" ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, pageSize, offset]
  );

  return NextResponse.json({
    data: result.rows.map((r) => mapProductListItem(r as Record<string, unknown>)),
    ...paginationMeta(total, page, pageSize),
  });
}
