import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool, query } from '@/lib/db';
import { mapVariant, VARIANT_SELECT } from '@/lib/products';
import { variantSchema } from '@/lib/schemas';

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
    `SELECT ${VARIANT_SELECT}
     FROM products.variants
     WHERE "ProductId" = $1
     ORDER BY is_default DESC, attrs_key ASC`,
    [id]
  );

  return NextResponse.json({
    data: result.rows.map((r) => mapVariant(r as Record<string, unknown>)),
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
  const parsed = variantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 }
    );
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
         WHERE "ProductId" = $1 AND is_default = true`,
        [id]
      );
    }

    const result = await client.query(
      `INSERT INTO products.variants (
        "ProductId", "Sku", "Barcode", attrs_key, attrs_json, is_default
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)
      RETURNING ${VARIANT_SELECT}`,
      [
        id,
        v.sku || null,
        v.barcode || null,
        attrsKey,
        attrsJson,
        v.isDefault ?? false,
      ]
    );
    await client.query('COMMIT');
    return NextResponse.json(
      { data: mapVariant(result.rows[0] as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Create failed';
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
