import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { mapMerchantPrice, PRICE_SELECT } from '@/lib/products';
import { merchantPriceUpdateSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; priceId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id, priceId } = await params;
  const body = await request.json();
  const parsed = merchantPriceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 }
    );
  }

  const existing = await query(
    `SELECT "Id" FROM merchants.merchant_prices WHERE "Id" = $1 AND "ProductId" = $2`,
    [priceId, id]
  );
  if (!existing.rows[0]) {
    return NextResponse.json({ error: 'Price not found' }, { status: 404 });
  }

  const p = parsed.data;
  const currencyCode =
    p.currencyCode === undefined || p.currencyCode === null || p.currencyCode === ''
      ? 'LKR'
      : String(p.currencyCode).trim() || 'LKR';

  try {
    await query(
      `UPDATE merchants.merchant_prices SET
        "Price" = $3,
        "OriginalPrice" = $4,
        "InStock" = $5,
        "ProductUrl" = $6,
        "CurrencyCode" = $7,
        "UpdatedAt" = NOW()
      WHERE "Id" = $1 AND "ProductId" = $2`,
      [
        priceId,
        id,
        p.price,
        p.originalPrice,
        p.inStock,
        p.productUrl || null,
        currencyCode,
      ]
    );

    const result = await query(
      `SELECT ${PRICE_SELECT}
       FROM merchants.merchant_prices mp
       JOIN merchants.merchants m ON m."Id" = mp."MerchantId"
       LEFT JOIN products.variants v ON v."Id" = mp."VariantId"
       WHERE mp."Id" = $1`,
      [priceId]
    );

    return NextResponse.json({
      data: mapMerchantPrice(result.rows[0] as Record<string, unknown>),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
