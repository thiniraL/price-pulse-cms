import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';
import { headerNavSchema } from '@/lib/schemas';
import { paginationMeta, parsePagination } from '@/lib/pagination';

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
    createdAt: String(row.CreatedAt),
    updatedAt: row.UpdatedAt ? String(row.UpdatedAt) : null,
  };
}

function mapSub(row: Record<string, unknown>) {
  return {
    id: String(row.Id),
    headerNavigationId: String(row.header_navigation_id),
    name: String(row.Name),
    slug: (row.Slug as string) ?? null,
    icon: (row.Icon as string) ?? null,
    displayOrder: Number(row.display_order ?? 0),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  const { page, pageSize, offset } = parsePagination(request.nextUrl.searchParams);

  const params: unknown[] = [];
  let where = '';
  if (q) {
    params.push(`%${q}%`);
    where = `WHERE "Title" ILIKE $1 OR COALESCE("Slug",'') ILIKE $1`;
  }

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM content.header_navigations ${where}`,
    params
  );
  const total = Number((countResult.rows[0] as { total: number }).total || 0);

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const navs = await query(
    `SELECT * FROM content.header_navigations ${where}
     ORDER BY "DisplayOrder" ASC, "Title" ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, pageSize, offset]
  );

  const navIds = navs.rows.map((r) => String((r as Record<string, unknown>).Id));
  let subs: { rows: Record<string, unknown>[] } = { rows: [] };
  if (navIds.length > 0) {
    const subResult = await query(
      `SELECT * FROM content.header_sub_navigations
       WHERE header_navigation_id = ANY($1::uuid[])
       ORDER BY display_order ASC, "Name" ASC`,
      [navIds]
    );
    subs = { rows: subResult.rows as Record<string, unknown>[] };
  }

  const subByParent = new Map<string, ReturnType<typeof mapSub>[]>();
  for (const row of subs.rows) {
    const mapped = mapSub(row);
    const list = subByParent.get(mapped.headerNavigationId) || [];
    list.push(mapped);
    subByParent.set(mapped.headerNavigationId, list);
  }

  return NextResponse.json({
    data: navs.rows.map((row) => {
      const nav = mapNav(row as Record<string, unknown>);
      return {
        ...nav,
        children: subByParent.get(nav.id) || [],
      };
    }),
    ...paginationMeta(total, page, pageSize),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

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
      `INSERT INTO content.header_navigations ("Title", "Slug", "Icon", "DisplayOrder", "IsActive")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        h.title,
        h.slug || null,
        h.icon || null,
        h.displayOrder ?? 0,
        h.isActive ?? true,
      ]
    );
    return NextResponse.json(
      { data: mapNav(result.rows[0] as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Create failed' },
      { status: 400 }
    );
  }
}
