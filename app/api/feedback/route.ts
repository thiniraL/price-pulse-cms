import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';
import { mapFeedback } from '@/lib/feedback';
import { paginationMeta, parsePagination } from '@/lib/pagination';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  const { page, pageSize, offset } = parsePagination(request.nextUrl.searchParams, {
    pageSize: 20,
  });

  const params: unknown[] = [];
  let where = '';
  if (q) {
    params.push(`%${q}%`);
    where = `WHERE
      "Message" ILIKE $1
      OR COALESCE("Email", '') ILIKE $1
      OR COALESCE("ProductName", '') ILIKE $1
      OR COALESCE("MerchantName", '') ILIKE $1
      OR COALESCE("PageUrl", '') ILIKE $1`;
  }

  try {
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM feedback.feedbacks ${where}`,
      params
    );
    const total = Number((countResult.rows[0] as { total: number }).total || 0);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const result = await query(
      `SELECT * FROM feedback.feedbacks ${where}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, pageSize, offset]
    );

    return NextResponse.json({
      data: result.rows.map((r) => mapFeedback(r as Record<string, unknown>)),
      ...paginationMeta(total, page, pageSize),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load feedback';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
