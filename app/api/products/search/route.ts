import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  const limit = Math.min(
    Number(request.nextUrl.searchParams.get('limit') || 20),
    50
  );

  if (q.length < 1) {
    return NextResponse.json({ data: [] });
  }

  const result = await query(
    `SELECT p."Id", p."Name", p."Slug", p."CategoryId",
            c."Name" AS "CategoryName"
     FROM products.products p
     LEFT JOIN products.categories c ON c."Id" = p."CategoryId"
     WHERE p."Name" ILIKE $1 OR COALESCE(p."Slug",'') ILIKE $1
     ORDER BY p."Name" ASC
     LIMIT $2`,
    [`%${q}%`, limit]
  );

  return NextResponse.json({
    data: result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.Id),
        name: String(r.Name),
        slug: (r.Slug as string) ?? null,
        categoryId: r.CategoryId ? String(r.CategoryId) : null,
        categoryName: (r.CategoryName as string) ?? null,
      };
    }),
  });
}
