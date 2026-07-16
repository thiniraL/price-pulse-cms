import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';
import { pageSectionSchema } from '@/lib/schemas';
import { paginationMeta, parsePagination } from '@/lib/pagination';

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
    createdAt: String(row.CreatedAt),
    updatedAt: row.UpdatedAt ? String(row.UpdatedAt) : null,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const pageName = (
    request.nextUrl.searchParams.get('pageName') || 'home'
  ).toLowerCase();
  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  const { page, pageSize, offset } = parsePagination(request.nextUrl.searchParams);

  const params: unknown[] = [pageName];
  let where = `WHERE lower("PageName") = lower($1)`;
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (
      "SectionTitle" ILIKE $2
      OR "ComponentKey" ILIKE $2
      OR COALESCE("DataSourceKey",'') ILIKE $2
      OR COALESCE("DataSourceTable",'') ILIKE $2
    )`;
  }

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM content.page_sections ${where}`,
    params
  );
  const total = Number((countResult.rows[0] as { total: number }).total || 0);

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const result = await query(
    `SELECT * FROM content.page_sections ${where}
     ORDER BY "DisplayOrder" ASC, "SectionTitle" ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, pageSize, offset]
  );

  return NextResponse.json({
    data: result.rows.map((r) => mapSection(r as Record<string, unknown>)),
    ...paginationMeta(total, page, pageSize),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

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
      `INSERT INTO content.page_sections (
        "PageName", "SectionTitle", "ComponentKey", "AdsEnabled", "AdsPosition",
        "DataSourceKey", "DataSourceTable", "ExploreEnabled", "ExploreText",
        "ExploreUrl", "DisplayOrder", "ItemCount"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
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
    return NextResponse.json(
      { data: mapSection(result.rows[0] as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Create failed' },
      { status: 400 }
    );
  }
}
