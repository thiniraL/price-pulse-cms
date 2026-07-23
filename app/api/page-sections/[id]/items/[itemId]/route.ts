import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { resolveSectionItemMode } from '@/lib/sectionItems';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; itemId: string }> };

async function getSection(id: string) {
  const result = await query(
    `SELECT * FROM content.page_sections WHERE "Id" = $1`,
    [id]
  );
  return (result.rows[0] as Record<string, unknown>) || null;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id, itemId } = await params;
  const section = await getSection(id);
  if (!section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  }

  const mode = resolveSectionItemMode(
    section.DataSourceTable as string | null,
    section.DataSourceKey as string | null,
    section.ComponentKey as string | null
  );
  const body = await request.json();

  try {
    if (body.itemType === 'ads') {
      await query(
        `UPDATE content.ads_feed
         SET "MerchantId" = COALESCE($2, "MerchantId"),
             "AdType" = COALESCE($3, "AdType"),
             "Title" = COALESCE($4, "Title"),
             "Description" = COALESCE($5, "Description"),
             "ImageUrl" = COALESCE($6, "ImageUrl"),
             "ClickUrl" = COALESCE($7, "ClickUrl"),
             "DisplayOrder" = COALESCE($8, "DisplayOrder"),
             "IsActive" = COALESCE($9, "IsActive"),
             "UpdatedAt" = NOW()
         WHERE "Id" = $1 AND "PageSectionId" = $10`,
        [
          itemId,
          body.merchantId ?? null,
          body.adType ?? null,
          body.title === undefined ? null : body.title,
          body.description === undefined ? null : body.description,
          body.imageUrl === undefined ? null : body.imageUrl,
          body.clickUrl ?? null,
          body.displayOrder ?? null,
          body.isActive ?? null,
          id,
        ]
      );
      return NextResponse.json({ success: true });
    }

    if (mode === 'product_detail_blocks') {
      const isSponsored =
        body.isSponsored === undefined ? null : Boolean(body.isSponsored);
      let sponsoredUrl: string | null = null;
      const hasSponsoredUrlUpdate =
        body.sponsoredUrl !== undefined || isSponsored === false;
      if (isSponsored === false) {
        sponsoredUrl = null;
      } else if (body.sponsoredUrl !== undefined) {
        sponsoredUrl =
          typeof body.sponsoredUrl === 'string' && body.sponsoredUrl.trim()
            ? body.sponsoredUrl.trim()
            : null;
      }

      const hasMerchantUpdate = body.merchantId !== undefined;
      const merchantId =
        typeof body.merchantId === 'string' && body.merchantId.trim()
          ? body.merchantId.trim()
          : null;

      await query(
        `UPDATE content.product_detail_blocks
         SET "DisplayOrder" = COALESCE($2, "DisplayOrder"),
             "IsActive" = COALESCE($3, "IsActive"),
             "VariantId" = COALESCE($4, "VariantId"),
             "IsSponsored" = COALESCE($5, "IsSponsored"),
             "SponsoredUrl" = CASE
                WHEN $5::boolean IS FALSE THEN NULL
                WHEN $7::boolean THEN $6
                ELSE "SponsoredUrl"
              END,
             "MerchantId" = CASE
                WHEN $9::boolean THEN $8::uuid
                ELSE "MerchantId"
              END,
             "UpdatedAt" = NOW()
         WHERE "Id" = $1`,
        [
          itemId,
          body.displayOrder ?? null,
          body.isActive ?? null,
          body.variantId === undefined ? null : body.variantId,
          isSponsored,
          sponsoredUrl,
          hasSponsoredUrlUpdate,
          merchantId,
          hasMerchantUpdate,
        ]
      );
      return NextResponse.json({ success: true });
    }

    if (mode === 'story_feed') {
      const isActive =
        body.isActive === undefined ? null : Boolean(body.isActive);
      const hasStoryUrlUpdate = body.storyUrl !== undefined;
      const storyUrl =
        typeof body.storyUrl === 'string' && body.storyUrl.trim()
          ? body.storyUrl.trim()
          : null;
      const hasDurationUpdate = body.duration !== undefined;

      await query(
        `UPDATE content.story_feed
         SET "MerchantId" = COALESCE($2, "MerchantId"),
             "Image" = COALESCE($3, "Image"),
             "Cta" = COALESCE($4, "Cta"),
             "StoryUrl" = CASE
                WHEN $7::boolean THEN $5
                ELSE "StoryUrl"
              END,
             "Duration" = CASE
                WHEN $8::boolean THEN $6
                ELSE "Duration"
              END,
             "IsActive" = COALESCE($9, "IsActive"),
             "UpdatedAt" = NOW()
         WHERE "Id" = $1`,
        [
          itemId,
          body.merchantId ?? null,
          body.image ?? null,
          body.cta ?? null,
          storyUrl,
          body.duration === undefined || body.duration === ''
            ? null
            : Number(body.duration),
          hasStoryUrlUpdate,
          hasDurationUpdate,
          isActive,
        ]
      );
      return NextResponse.json({ success: true });
    }

    if (mode === 'product_feature_collections') {
      await query(
        `UPDATE content.product_feature_collections
         SET "Title" = COALESCE($2, "Title"),
             "ProductId1" = COALESCE($3, "ProductId1"),
             "ProductId2" = COALESCE($4, "ProductId2"),
             "ProductId3" = COALESCE($5, "ProductId3"),
             "ProductId4" = COALESCE($6, "ProductId4"),
             "DisplayOrder" = COALESCE($7, "DisplayOrder"),
             "ExploreText" = COALESCE($8, "ExploreText"),
             "ExploreUrl" = COALESCE($9, "ExploreUrl"),
             "IsActive" = COALESCE($10, "IsActive"),
             "UpdatedAt" = NOW()
         WHERE "Id" = $1`,
        [
          itemId,
          body.title ?? null,
          body.productId1 === undefined ? null : body.productId1,
          body.productId2 === undefined ? null : body.productId2,
          body.productId3 === undefined ? null : body.productId3,
          body.productId4 === undefined ? null : body.productId4,
          body.displayOrder ?? null,
          body.exploreText === undefined ? null : body.exploreText,
          body.exploreUrl === undefined ? null : body.exploreUrl,
          body.isActive ?? null,
        ]
      );
      return NextResponse.json({ success: true });
    }

    if (mode === 'sponsored_products') {
      await query(
        `UPDATE content.sponsored_products
         SET "ProductId" = COALESCE($2, "ProductId"),
             "MerchantId" = COALESCE($3, "MerchantId"),
             "CategoryId" = COALESCE($4, "CategoryId"),
             "MerchantProductUrl" = COALESCE($5, "MerchantProductUrl"),
             "CampaignStartDate" = COALESCE($6, "CampaignStartDate"),
             "CampaignEndDate" = COALESCE($7, "CampaignEndDate"),
             "DisplayOrder" = COALESCE($8, "DisplayOrder"),
             "IsActive" = COALESCE($9, "IsActive"),
             "UpdatedAt" = NOW()
         WHERE "Id" = $1`,
        [
          itemId,
          body.productId ?? null,
          body.merchantId ?? null,
          body.categoryId ?? null,
          body.merchantProductUrl === undefined
            ? null
            : body.merchantProductUrl,
          body.campaignStartDate === undefined
            ? null
            : body.campaignStartDate,
          body.campaignEndDate === undefined ? null : body.campaignEndDate,
          body.displayOrder ?? null,
          body.isActive ?? null,
        ]
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: `Cannot update items for mode: ${mode}` },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id, itemId } = await params;
  const section = await getSection(id);
  if (!section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  }

  const type = request.nextUrl.searchParams.get('type');

  const mode = resolveSectionItemMode(
    section.DataSourceTable as string | null,
    section.DataSourceKey as string | null,
    section.ComponentKey as string | null
  );

  try {
    if (type === 'ads') {
      await query(
        `DELETE FROM content.ads_feed WHERE "Id" = $1 AND "PageSectionId" = $2`,
        [itemId, id]
      );
      return NextResponse.json({ success: true });
    }

    if (mode === 'product_detail_blocks') {
      await query(
        `UPDATE content.product_detail_blocks
         SET "IsDeleted" = true, "DeletedAt" = NOW(), "UpdatedAt" = NOW()
         WHERE "Id" = $1`,
        [itemId]
      );
      return NextResponse.json({ success: true });
    }

    if (mode === 'story_feed') {
      await query(
        `UPDATE content.story_feed
         SET "IsDeleted" = true, "DeletedAt" = NOW(), "UpdatedAt" = NOW()
         WHERE "Id" = $1`,
        [itemId]
      );
      return NextResponse.json({ success: true });
    }

    if (mode === 'product_feature_collections') {
      await query(
        `UPDATE content.product_feature_collections
         SET "IsDeleted" = true, "DeletedAt" = NOW(), "UpdatedAt" = NOW()
         WHERE "Id" = $1`,
        [itemId]
      );
      return NextResponse.json({ success: true });
    }

    if (mode === 'sponsored_products') {
      await query(`DELETE FROM content.sponsored_products WHERE "Id" = $1`, [
        itemId,
      ]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: `Cannot delete items for mode: ${mode}` },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 400 }
    );
  }
}
