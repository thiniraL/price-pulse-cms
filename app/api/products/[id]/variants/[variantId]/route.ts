import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool, query } from '@/lib/db';
import { mapVariant, VARIANT_SELECT } from '@/lib/products';
import { variantSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; variantId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id, variantId } = await params;
  const body = await request.json();
  const parsed = variantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 }
    );
  }

  const existing = await query(
    `SELECT "Id" FROM products.variants WHERE "Id" = $1 AND "ProductId" = $2`,
    [variantId, id]
  );
  if (!existing.rows[0]) {
    return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
  }

  const v = parsed.data;
  const attrsKey = (v.attrsKey || 'default').trim() || 'default';
  let attrsJson: string | null = null;
  if (v.attrsJson != null && String(v.attrsJson).trim() !== '') {
    try {
      const parsedJson = JSON.parse(String(v.attrsJson));
      attrsJson = JSON.stringify(parsedJson);
    } catch {
      return NextResponse.json(
        { error: 'attrsJson must be valid JSON' },
        { status: 400 }
      );
    }
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    if (v.isDefault) {
      await client.query(
        `UPDATE products.variants SET is_default = false, updated_at = NOW()
         WHERE "ProductId" = $1 AND is_default = true AND "Id" <> $2`,
        [id, variantId]
      );
    }

    const result = await client.query(
      `UPDATE products.variants SET
        "Sku" = $3,
        "Barcode" = $4,
        attrs_key = $5,
        attrs_json = $6::jsonb,
        is_default = $7,
        updated_at = NOW()
      WHERE "Id" = $1 AND "ProductId" = $2
      RETURNING ${VARIANT_SELECT}`,
      [
        variantId,
        id,
        v.sku || null,
        v.barcode || null,
        attrsKey,
        attrsJson,
        v.isDefault ?? false,
      ]
    );
    await client.query('COMMIT');
    return NextResponse.json({
      data: mapVariant(result.rows[0] as Record<string, unknown>),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json(
      {
        error: message.includes('uq_variant_per_product_key')
          ? 'A variant with this attrs key already exists for the product'
          : message,
      },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
