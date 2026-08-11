import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { serializeSearchTags } from '@/lib/productMedia';
import {
  mapMerchantPrice,
  mapProductDetail,
  mapVariant,
  PRICE_SELECT,
  VARIANT_SELECT,
} from '@/lib/products';
import { productUpdateSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

async function loadProductBundle(id: string) {
  const productResult = await query(
    `SELECT p.*,
            b."Name" AS "BrandName",
            c."Name" AS "CategoryName",
            sc."Name" AS "SubcategoryName"
     FROM products.products p
     LEFT JOIN products.brands b ON b."Id" = p."BrandId"
     LEFT JOIN products.categories c ON c."Id" = p."CategoryId"
     LEFT JOIN products.subcategories sc ON sc."Id" = p."SubcategoryId"
     WHERE p."Id" = $1`,
    [id]
  );
  if (!productResult.rows[0]) return null;

  const variantsResult = await query(
    `SELECT ${VARIANT_SELECT}
     FROM products.variants
     WHERE "ProductId" = $1
     ORDER BY is_default DESC, attrs_key ASC`,
    [id]
  );

  const pricesResult = await query(
    `SELECT ${PRICE_SELECT}
     FROM merchants.merchant_prices mp
     JOIN merchants.merchants m ON m."Id" = mp."MerchantId"
     LEFT JOIN products.variants v ON v."Id" = mp."VariantId"
     WHERE mp."ProductId" = $1
     ORDER BY m."Name" ASC, v.attrs_key ASC NULLS FIRST`,
    [id]
  );

  return mapProductDetail(
    productResult.rows[0] as Record<string, unknown>,
    variantsResult.rows.map((r) => mapVariant(r as Record<string, unknown>)),
    pricesResult.rows.map((r) => mapMerchantPrice(r as Record<string, unknown>))
  );
}

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const data = await loadProductBundle(id);
  if (!data) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 }
    );
  }

  const existing = await query(
    `SELECT "Id", "CategoryId", "SubcategoryId" FROM products.products WHERE "Id" = $1`,
    [id]
  );
  if (!existing.rows[0]) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const current = existing.rows[0] as Record<string, unknown>;
  const p = parsed.data;
  const categoryId = p.categoryId || String(current.CategoryId);
  const subcategoryId = p.subcategoryId || String(current.SubcategoryId);

  try {
    await query(
      `UPDATE products.products SET
        "Name" = $2,
        "Slug" = $3,
        "Status" = $4::products.product_status_enum,
        "CategoryId" = $5,
        "SubcategoryId" = $6,
        search_tags = CASE
          WHEN $7::boolean THEN $8::jsonb
          ELSE search_tags
        END,
        updated_at = NOW()
      WHERE "Id" = $1`,
      [
        id,
        p.name,
        p.slug || null,
        p.status,
        categoryId,
        subcategoryId,
        p.searchTags !== undefined,
        p.searchTags === undefined ? null : serializeSearchTags(p.searchTags),
      ]
    );

    const data = await loadProductBundle(id);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
