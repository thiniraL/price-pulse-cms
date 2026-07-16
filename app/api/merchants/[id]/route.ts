import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';
import { merchantSchema } from '@/lib/schemas';
import { deleteImageByUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function mapMerchant(row: Record<string, unknown>) {
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

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await query(
    `SELECT * FROM merchants.merchants WHERE "Id" = $1`,
    [id]
  );
  if (!result.rows[0]) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
  }
  return NextResponse.json({
    data: mapMerchant(result.rows[0] as Record<string, unknown>),
  });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = merchantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 }
    );
  }

  const existing = await query(
    `SELECT * FROM merchants.merchants WHERE "Id" = $1`,
    [id]
  );
  if (!existing.rows[0]) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
  }

  const current = existing.rows[0] as Record<string, unknown>;
  const m = parsed.data;
  let originalLogoUrl = (current.OriginalLogoUrl as string) ?? null;
  const nextLogo = m.logoUrl !== undefined ? m.logoUrl : (current.LogoUrl as string);

  // Preserve original external URL when first switching logo.
  if (
    !originalLogoUrl &&
    current.LogoUrl &&
    nextLogo &&
    nextLogo !== current.LogoUrl
  ) {
    originalLogoUrl = current.LogoUrl as string;
  }

  try {
    const result = await query(
      `UPDATE merchants.merchants SET
        "Name" = $2,
        "Website" = $3,
        "LogoUrl" = $4,
        "OriginalLogoUrl" = $5,
        "Email" = $6,
        "ContactName" = $7,
        "Phone" = $8,
        "SupportsMintpay" = $9,
        "SupportsKokopay" = $10,
        "SellingProbability" = $11,
        "ProbabilityNote" = $12,
        "CampaignType" = $13,
        "CampaignStartDate" = $14,
        "CampaignEndDate" = $15,
        "IsActive" = $16,
        "UpdatedAt" = NOW()
      WHERE "Id" = $1
      RETURNING *`,
      [
        id,
        m.name,
        m.website || null,
        nextLogo || null,
        originalLogoUrl,
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

    return NextResponse.json({
      data: mapMerchant(result.rows[0] as Record<string, unknown>),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const existing = await query(
    `SELECT * FROM merchants.merchants WHERE "Id" = $1`,
    [id]
  );
  if (!existing.rows[0]) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
  }

  const logoUrl = (existing.rows[0] as Record<string, unknown>).LogoUrl as
    | string
    | null;

  try {
    await query(`DELETE FROM merchants.merchants WHERE "Id" = $1`, [id]);
    if (logoUrl) {
      await deleteImageByUrl(logoUrl).catch(() => undefined);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    return NextResponse.json(
      {
        error:
          message.includes('foreign key') || message.includes('violates')
            ? 'Cannot delete merchant: it is referenced by other records. Deactivate instead.'
            : message,
      },
      { status: 400 }
    );
  }
}
