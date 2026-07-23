import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { mapMerchantPrice, PRICE_SELECT } from '@/lib/products';
import { merchantPriceSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

async function productExists(id: string) {
  const result = await query(
    `SELECT 1 FROM products.products WHERE "Id" = $1`,
    [id]
  );
  return result.rows.length > 0;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  if (!(await productExists(id))) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const result = await query(
    `SELECT ${PRICE_SELECT}
     FROM merchants.merchant_prices mp
     JOIN merchants.merchants m ON m."Id" = mp."MerchantId"
     LEFT JOIN products.variants v ON v."Id" = mp."VariantId"
     WHERE mp."ProductId" = $1
     ORDER BY m."Name" ASC, v.attrs_key ASC NULLS FIRST`,
    [id]
  );

  return NextResponse.json({
    data: result.rows.map((r) => mapMerchantPrice(r as Record<string, unknown>)),
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  if (!(await productExists(id))) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const body = await request.json();
  const parsed = merchantPriceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 }
    );
  }

  const p = parsed.data;
  const currencyCode = (p.currencyCode || 'LKR').trim() || 'LKR';

  if (p.variantId) {
    const variantCheck = await query(
      `SELECT 1 FROM products.variants WHERE "Id" = $1 AND "ProductId" = $2`,
      [p.variantId, id]
    );
    if (!variantCheck.rows[0]) {
      return NextResponse.json(
        { error: 'Variant does not belong to this product' },
        { status: 400 }
      );
    }
  }

  const merchantCheck = await query(
    `SELECT 1 FROM merchants.merchants WHERE "Id" = $1`,
    [p.merchantId]
  );
  if (!merchantCheck.rows[0]) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 400 });
  }

  try {
    const insert = await query(
      `INSERT INTO merchants.merchant_prices (
        "MerchantId", "ProductId", "VariantId",
        "ProductUrl", "CurrencyCode", "OriginalPrice", "Price", "InStock"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING "Id"`,
      [
        p.merchantId,
        id,
        p.variantId || null,
        p.productUrl || null,
        currencyCode,
        p.originalPrice,
        p.price,
        p.inStock ?? true,
      ]
    );

    const newId = String((insert.rows[0] as { Id: string }).Id);
    const result = await query(
      `SELECT ${PRICE_SELECT}
       FROM merchants.merchant_prices mp
       JOIN merchants.merchants m ON m."Id" = mp."MerchantId"
       LEFT JOIN products.variants v ON v."Id" = mp."VariantId"
       WHERE mp."Id" = $1`,
      [newId]
    );

    return NextResponse.json(
      { data: mapMerchantPrice(result.rows[0] as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create failed';
    return NextResponse.json(
      {
        error: message.includes('uq_merchant_price_per_variant')
          ? 'A price already exists for this merchant + variant'
          : message,
      },
      { status: 400 }
    );
  }
}
