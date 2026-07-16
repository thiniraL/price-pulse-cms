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

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;
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
      `UPDATE content.header_sub_navigations
       SET header_navigation_id = $2, "Name" = $3, "Slug" = $4, "Icon" = $5,
           display_order = $6, is_active = $7, updated_at = NOW()
       WHERE "Id" = $1
       RETURNING *`,
      [
        id,
        s.headerNavigationId,
        s.name,
        s.slug || null,
        s.icon || null,
        s.displayOrder ?? 0,
        s.isActive ?? true,
      ]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({
      data: mapSub(result.rows[0] as Record<string, unknown>),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await query(
    `DELETE FROM content.header_sub_navigations WHERE "Id" = $1 RETURNING "Id"`,
    [id]
  );
  if (!result.rows[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
