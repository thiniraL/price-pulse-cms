import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';
import { headerSubNavSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function mapSub(row: Record<string, unknown>) {
  return {
    id: String(row.Id),
    headerNavigationId: String(row.header_navigation_id),
    name: String(row.Name),
    slug: (row.Slug as string) ?? null,
    icon: (row.Icon as string) ?? null,
    displayOrder: Number(row.display_order ?? 0),
    isActive: Boolean(row.is_active),
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const parsed = headerSubNavSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 }
    );
  }

  const s = parsed.data;
  try {
    const result = await query(
      `INSERT INTO content.header_sub_navigations (
        header_navigation_id, "Name", "Slug", "Icon", display_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        s.headerNavigationId,
        s.name,
        s.slug || null,
        s.icon || null,
        s.displayOrder ?? 0,
        s.isActive ?? true,
      ]
    );
    return NextResponse.json(
      { data: mapSub(result.rows[0] as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Create failed' },
      { status: 400 }
    );
  }
}
