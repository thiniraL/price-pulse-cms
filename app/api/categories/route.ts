import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const result = await query(
    `SELECT "Id", "Name", "Slug" FROM products.categories ORDER BY "Name" ASC`
  );

  return NextResponse.json({
    data: result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.Id),
        name: String(r.Name),
        slug: (r.Slug as string) ?? null,
      };
    }),
  });
}
