import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';
import { pageSectionSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function mapSection(row: Record<string, unknown>) {
  return {
    id: String(row.Id),
    pageName: String(row.PageName),
    sectionTitle: String(row.SectionTitle),
    componentKey: String(row.ComponentKey),
    adsEnabled: Boolean(row.AdsEnabled),
    adsPosition: String(row.AdsPosition),
    dataSourceKey: (row.DataSourceKey as string) ?? null,
    dataSourceTable: (row.DataSourceTable as string) ?? null,
    exploreEnabled: Boolean(row.ExploreEnabled),
    exploreText: (row.ExploreText as string) ?? null,
    exploreUrl: (row.ExploreUrl as string) ?? null,
    displayOrder: Number(row.DisplayOrder ?? 1),
    itemCount:
      row.ItemCount === null || row.ItemCount === undefined
        ? null
        : Number(row.ItemCount),
  };
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await query(
    `SELECT * FROM content.page_sections WHERE "Id" = $1`,
    [id]
  );
  if (!result.rows[0]) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  }
  return NextResponse.json({
    data: mapSection(result.rows[0] as Record<string, unknown>),
  });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const parsed = pageSectionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 }
    );
  }

  const s = parsed.data;
  try {
    const result = await query(
      `UPDATE content.page_sections SET
        "PageName" = $2,
        "SectionTitle" = $3,
        "ComponentKey" = $4,
        "AdsEnabled" = $5,
        "AdsPosition" = $6,
        "DataSourceKey" = $7,
        "DataSourceTable" = $8,
        "ExploreEnabled" = $9,
        "ExploreText" = $10,
        "ExploreUrl" = $11,
        "DisplayOrder" = $12,
        "ItemCount" = $13,
        "UpdatedAt" = NOW()
      WHERE "Id" = $1
      RETURNING *`,
      [
        id,
        s.pageName.toLowerCase(),
        s.sectionTitle,
        s.componentKey,
        s.adsEnabled ?? false,
        s.adsPosition ?? 'None',
        s.dataSourceKey || null,
        s.dataSourceTable || null,
        s.exploreEnabled ?? false,
        s.exploreText || null,
        s.exploreUrl || null,
        s.displayOrder ?? 1,
        s.itemCount ?? null,
      ]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({
      data: mapSection(result.rows[0] as Record<string, unknown>),
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

  const ads = await query(
    `SELECT COUNT(*)::int AS count FROM content.ads_feed WHERE "PageSectionId" = $1`,
    [id]
  );
  const count = Number((ads.rows[0] as { count: number }).count || 0);
  if (count > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete section: ${count} ads_feed row(s) still reference it. Remove those ads first.`,
      },
      { status: 400 }
    );
  }

  try {
    const result = await query(
      `DELETE FROM content.page_sections WHERE "Id" = $1 RETURNING "Id"`,
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
