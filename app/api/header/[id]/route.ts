import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';
import { headerNavSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function mapNav(row: Record<string, unknown>) {
  return {
    id: String(row.Id),
    title: String(row.Title),
    slug: (row.Slug as string) ?? null,
    icon: (row.Icon as string) ?? null,
    displayOrder: Number(row.DisplayOrder ?? 0),
    isActive: Boolean(row.IsActive),
  };
}

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const parsed = headerNavSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 }
    );
  }

  const h = parsed.data;
  try {
    const result = await query(
      `UPDATE content.header_navigations
       SET "Title" = $2, "Slug" = $3, "Icon" = $4, "DisplayOrder" = $5,
           "IsActive" = $6, "UpdatedAt" = NOW()
       WHERE "Id" = $1
       RETURNING *`,
      [
        id,
        h.title,
        h.slug || null,
        h.icon || null,
        h.displayOrder ?? 0,
        h.isActive ?? true,
      ]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({
      data: mapNav(result.rows[0] as Record<string, unknown>),
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
  try {
    // Sub-navs cascade via FK
    const result = await query(
      `DELETE FROM content.header_navigations WHERE "Id" = $1 RETURNING "Id"`,
      [id]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 400 }
    );
  }
}
