import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';
import { merchantSchema } from '@/lib/schemas';
import { paginationMeta, parsePagination } from '@/lib/pagination';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export type MerchantRow = {
  id: string;
  name: string;
  website: string | null;
  logoUrl: string | null;
  originalLogoUrl: string | null;
  email: string;
  contactName: string | null;
  phone: string | null;
  supportsMintpay: boolean;
  supportsKokopay: boolean;
  sellingProbability: number | null;
  probabilityNote: string | null;
  campaignType: string | null;
  campaignStartDate: string | null;
  campaignEndDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
};

function mapMerchant(row: Record<string, unknown>): MerchantRow {
  return {
    id: String(row.Id),
    name: String(row.Name),
    website: (row.Website as string) ?? null,
    logoUrl: (row.LogoUrl as string) ?? null,
    originalLogoUrl: (row.OriginalLogoUrl as string) ?? null,
    email: String(row.Email),
    contactName: (row.ContactName as string) ?? null,
    phone: (row.Phone as string) ?? null,
    supportsMintpay: Boolean(row.SupportsMintpay),
    supportsKokopay: Boolean(row.SupportsKokopay),
    sellingProbability:
      row.SellingProbability === null || row.SellingProbability === undefined
        ? null
        : Number(row.SellingProbability),
    probabilityNote: (row.ProbabilityNote as string) ?? null,
    campaignType: (row.CampaignType as string) ?? null,
    campaignStartDate: row.CampaignStartDate
      ? String(row.CampaignStartDate).slice(0, 10)
      : null,
    campaignEndDate: row.CampaignEndDate
      ? String(row.CampaignEndDate).slice(0, 10)
      : null,
    isActive: Boolean(row.IsActive),
    createdAt: String(row.CreatedAt),
    updatedAt: row.UpdatedAt ? String(row.UpdatedAt) : null,
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
    where = `WHERE "Name" ILIKE $1 OR "Email" ILIKE $1 OR COALESCE("Website",'') ILIKE $1`;
  }

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM merchants.merchants ${where}`,
    params
  );
  const total = Number((countResult.rows[0] as { total: number }).total || 0);

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const result = await query(
    `SELECT * FROM merchants.merchants ${where}
     ORDER BY "Name" ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, pageSize, offset]
  );

  return NextResponse.json({
    data: result.rows.map((r) => mapMerchant(r as Record<string, unknown>)),
    ...paginationMeta(total, page, pageSize),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const body = await request.json();
  const parsed = merchantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 }
    );
  }

  const m = parsed.data;
  try {
    const result = await query(
      `INSERT INTO merchants.merchants (
        "Name", "Website", "LogoUrl", "Email", "ContactName", "Phone",
        "SupportsMintpay", "SupportsKokopay", "SellingProbability", "ProbabilityNote",
        "CampaignType", "CampaignStartDate", "CampaignEndDate", "IsActive"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
      ) RETURNING *`,
      [
        m.name,
        m.website || null,
        m.logoUrl || null,
        m.email,
        m.contactName || null,
        m.phone || null,
        m.supportsMintpay ?? false,
        m.supportsKokopay ?? false,
        m.sellingProbability ?? null,
        m.probabilityNote || null,
        m.campaignType || null,
        m.campaignStartDate || null,
        m.campaignEndDate || null,
        m.isActive ?? true,
      ]
    );

    return NextResponse.json(
      { data: mapMerchant(result.rows[0] as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
