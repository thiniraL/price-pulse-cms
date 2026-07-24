import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';
import { mapFeedback } from '@/lib/feedback';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;

  try {
    const result = await query(
      `SELECT * FROM feedback.feedbacks WHERE "Id" = $1`,
      [id]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: mapFeedback(result.rows[0] as Record<string, unknown>),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load feedback';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
