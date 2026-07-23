import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { resolveSectionItemMode } from '@/lib/sectionItems';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

async function getSection(id: string) {
  const result = await query(
    `SELECT * FROM content.page_sections WHERE "Id" = $1`,
    [id]
  );
  return (result.rows[0] as Record<string, unknown>) || null;
}

async function loadAds(sectionId: string) {
  const result = await query(
    `SELECT a.*, m."Name" AS "MerchantName"
     FROM content.ads_feed a
     LEFT JOIN merchants.merchants m ON m."Id" = a."MerchantId"
     WHERE a."PageSectionId" = $1
     ORDER BY a."DisplayOrder" ASC, a."CreatedAt" DESC`,
    [sectionId]
  );
  return result.rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.Id),
      merchantId: String(r.MerchantId),
      merchantName: (r.MerchantName as string) ?? null,
      adType: String(r.AdType),
      title: (r.Title as string) ?? null,
      description: (r.Description as string) ?? null,
      imageUrl: (r.ImageUrl as string) ?? null,
      videoUrl: (r.VideoUrl as string) ?? null,
      clickUrl: String(r.ClickUrl),
      displayOrder: Number(r.DisplayOrder ?? 1),
      isActive: Boolean(r.IsActive),
    };
  });
}

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const section = await getSection(id);
  if (!section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  }

  const mode = resolveSectionItemMode(
    section.DataSourceTable as string | null,
    section.DataSourceKey as string | null,
    section.ComponentKey as string | null
  );
  const key = (section.DataSourceKey as string) || '';
  const itemCount =
    section.ItemCount === null || section.ItemCount === undefined
      ? 15
      : Number(section.ItemCount);
  const adsEnabled = Boolean(section.AdsEnabled);
  const ads = await loadAds(id);

  if (mode === 'price_drops') {
    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM merchants.merchant_prices mp
       WHERE mp."PriceDropPercent" IS NOT NULL
         AND mp."PriceDropPercent" >= 1
         AND mp."PriceDropPercent" <= 50
         AND mp."LastScrapedAt" IS NOT NULL
         AND mp."LastScrapedAt" >= NOW() - $1::interval
         AND mp."Price" IS NOT NULL
         AND mp."Price" > 0
         AND mp."OriginalPrice" IS NOT NULL
         AND mp."OriginalPrice" > mp."Price"
         AND mp."Price" >= mp."OriginalPrice" * 0.5`,
      ['7 days']
    );
    const total = Number((countResult.rows[0] as { total: number }).total || 0);

    const result = await query(
      `SELECT mp."Id",
              mp."ProductId",
              mp."MerchantId",
              mp."Price" AS "CurrentPrice",
              mp."OriginalPrice",
              mp."PriceDropPercent",
              mp."CurrencyCode",
              mp."ProductUrl",
              mp."LastScrapedAt",
              p."Name" AS "ProductName",
              p."Slug" AS "ProductSlug",
              p."Images" AS "ProductImages",
              m."Name" AS "MerchantName",
              m."LogoUrl" AS "MerchantLogoUrl",
              c."Name" AS "CategoryName"
       FROM merchants.merchant_prices mp
       JOIN products.products p ON p."Id" = mp."ProductId"
       JOIN merchants.merchants m ON m."Id" = mp."MerchantId"
       LEFT JOIN products.categories c ON c."Id" = p."CategoryId"
       WHERE mp."PriceDropPercent" IS NOT NULL
         AND mp."PriceDropPercent" >= 1
         AND mp."PriceDropPercent" <= 50
         AND mp."LastScrapedAt" IS NOT NULL
         AND mp."LastScrapedAt" >= NOW() - $1::interval
         AND mp."Price" IS NOT NULL
         AND mp."Price" > 0
         AND mp."OriginalPrice" IS NOT NULL
         AND mp."OriginalPrice" > mp."Price"
         AND mp."Price" >= mp."OriginalPrice" * 0.5
       ORDER BY mp."PriceDropPercent" DESC, mp."LastScrapedAt" DESC
       LIMIT $2`,
      ['7 days', itemCount]
    );

    return NextResponse.json({
      mode,
      adsEnabled,
      ads,
      dataSourceKey: key,
      dataSourceTable: section.DataSourceTable,
      itemCount,
      totalEligible: total,
      message:
        'Best price drops are auto-loaded from merchants.merchant_prices (drop 1–50% vs OriginalPrice, scraped in last 7 days). Drops over 50% are excluded as bad scrape data. Same rules as the home page. Edit ItemCount on the section to change how many show.',
      data: result.rows.map((row) => {
        const r = row as Record<string, unknown>;
        let thumbnailUrl: string | null = null;
        const images = r.ProductImages;
        if (typeof images === 'string' && images.trim()) {
          try {
            const parsed = JSON.parse(images);
            if (Array.isArray(parsed) && parsed[0]) {
              thumbnailUrl =
                typeof parsed[0] === 'string'
                  ? parsed[0]
                  : parsed[0].url || parsed[0].Url || null;
            } else if (parsed && typeof parsed === 'object' && parsed.url) {
              thumbnailUrl = String(parsed.url);
            }
          } catch {
            thumbnailUrl = images.startsWith('http') ? images : null;
          }
        }
        return {
          id: String(r.Id),
          productId: String(r.ProductId),
          productName: (r.ProductName as string) ?? null,
          productSlug: (r.ProductSlug as string) ?? null,
          thumbnailUrl,
          merchantId: String(r.MerchantId),
          merchantName: (r.MerchantName as string) ?? null,
          merchantLogoUrl: (r.MerchantLogoUrl as string) ?? null,
          categoryName: (r.CategoryName as string) ?? null,
          currentPrice: r.CurrentPrice === null ? null : Number(r.CurrentPrice),
          originalPrice:
            r.OriginalPrice === null || r.OriginalPrice === undefined
              ? null
              : Number(r.OriginalPrice),
          priceDropPercent:
            r.PriceDropPercent === null ? null : Number(r.PriceDropPercent),
          currency: (r.CurrencyCode as string) ?? null,
          productUrl: (r.ProductUrl as string) ?? null,
          lastScrapedAt: r.LastScrapedAt ? String(r.LastScrapedAt) : null,
        };
      }),
    });
  }

  if (mode === 'computed') {
    return NextResponse.json({
      mode,
      adsEnabled,
      ads,
      message:
        'This section loads data automatically from the backend. No curated items to edit.',
      data: [],
    });
  }

  if (mode === 'none') {
    return NextResponse.json({
      mode,
      adsEnabled,
      ads,
      message:
        'Set DataSourceTable / DataSourceKey on the section to manage products or merchants.',
      data: [],
    });
  }

  if (mode === 'product_detail_blocks') {
    const result = await query(
      `SELECT b."Id", b."ProductId", b."VariantId", b."DataSourceKey",
              b."DisplayOrder", b."IsActive",
              COALESCE(b."IsSponsored", false) AS "IsSponsored",
              b."SponsoredUrl",
              b."MerchantId",
              m."Name" AS "MerchantName",
              p."Name" AS "ProductName", p."Slug" AS "ProductSlug"
       FROM content.product_detail_blocks b
       LEFT JOIN products.products p ON p."Id" = b."ProductId"
       LEFT JOIN merchants.merchants m ON m."Id" = b."MerchantId"
       WHERE b."IsDeleted" = false
         AND lower(COALESCE(b."DataSourceKey",'')) = lower($1)
       ORDER BY b."DisplayOrder" ASC, b."CreatedAt" DESC`,
      [key]
    );
    return NextResponse.json({
      mode,
      adsEnabled,
      ads,
      dataSourceKey: key,
      data: result.rows.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.Id),
          productId: String(r.ProductId),
          productName: (r.ProductName as string) ?? null,
          productSlug: (r.ProductSlug as string) ?? null,
          variantId: r.VariantId ? String(r.VariantId) : null,
          displayOrder: Number(r.DisplayOrder ?? 1),
          isActive: Boolean(r.IsActive),
          isSponsored: Boolean(r.IsSponsored),
          sponsoredUrl: (r.SponsoredUrl as string) ?? null,
          merchantId: r.MerchantId ? String(r.MerchantId) : null,
          merchantName: (r.MerchantName as string) ?? null,
        };
      }),
    });
  }

  if (mode === 'story_feed') {
    const result = await query(
      `SELECT s."Id", s."MerchantId", s."Image", s."Cta", s."StoryUrl", s."Duration",
              m."Name" AS "MerchantName", m."LogoUrl"
       FROM content.story_feed s
       LEFT JOIN merchants.merchants m ON m."Id" = s."MerchantId"
       WHERE s."IsDeleted" = false
       ORDER BY s."CreatedAt" DESC`
    );
    return NextResponse.json({
      mode,
      adsEnabled,
      ads,
      data: result.rows.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.Id),
          merchantId: String(r.MerchantId),
          merchantName: (r.MerchantName as string) ?? null,
          logoUrl: (r.LogoUrl as string) ?? null,
          image: String(r.Image),
          cta: String(r.Cta),
          storyUrl: (r.StoryUrl as string) ?? null,
          duration:
            r.Duration === null || r.Duration === undefined
              ? null
              : Number(r.Duration),
        };
      }),
    });
  }

  if (mode === 'product_feature_collections') {
    const result = await query(
      `SELECT c.*,
              p1."Name" AS "ProductName1",
              p2."Name" AS "ProductName2",
              p3."Name" AS "ProductName3",
              p4."Name" AS "ProductName4"
       FROM content.product_feature_collections c
       LEFT JOIN products.products p1 ON p1."Id" = c."ProductId1"
       LEFT JOIN products.products p2 ON p2."Id" = c."ProductId2"
       LEFT JOIN products.products p3 ON p3."Id" = c."ProductId3"
       LEFT JOIN products.products p4 ON p4."Id" = c."ProductId4"
       WHERE c."IsDeleted" = false
         AND lower(COALESCE(c."DataSourceKey",'')) = lower($1)
       ORDER BY c."DisplayOrder" ASC`,
      [key]
    );
    return NextResponse.json({
      mode,
      adsEnabled,
      ads,
      dataSourceKey: key,
      data: result.rows.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.Id),
          title: String(r.Title),
          productId1: r.ProductId1 ? String(r.ProductId1) : null,
          productId2: r.ProductId2 ? String(r.ProductId2) : null,
          productId3: r.ProductId3 ? String(r.ProductId3) : null,
          productId4: r.ProductId4 ? String(r.ProductId4) : null,
          productName1: (r.ProductName1 as string) ?? null,
          productName2: (r.ProductName2 as string) ?? null,
          productName3: (r.ProductName3 as string) ?? null,
          productName4: (r.ProductName4 as string) ?? null,
          exploreText: (r.ExploreText as string) ?? null,
          exploreUrl: (r.ExploreUrl as string) ?? null,
          displayOrder: Number(r.DisplayOrder ?? 1),
          isActive: Boolean(r.IsActive),
        };
      }),
    });
  }

  if (mode === 'sponsored_products') {
    const result = await query(
      `SELECT s.*,
              p."Name" AS "ProductName",
              m."Name" AS "MerchantName",
              c."Name" AS "CategoryName"
       FROM content.sponsored_products s
       LEFT JOIN products.products p ON p."Id" = s."ProductId"
       LEFT JOIN merchants.merchants m ON m."Id" = s."MerchantId"
       LEFT JOIN products.categories c ON c."Id" = s."CategoryId"
       WHERE lower(COALESCE(s."DataSourceKey",'')) = lower($1)
       ORDER BY s."DisplayOrder" ASC`,
      [key]
    );
    return NextResponse.json({
      mode,
      adsEnabled,
      ads,
      dataSourceKey: key,
      data: result.rows.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.Id),
          productId: String(r.ProductId),
          productName: (r.ProductName as string) ?? null,
          merchantId: String(r.MerchantId),
          merchantName: (r.MerchantName as string) ?? null,
          categoryId: String(r.CategoryId),
          categoryName: (r.CategoryName as string) ?? null,
          merchantProductUrl: (r.MerchantProductUrl as string) ?? null,
          campaignStartDate: r.CampaignStartDate
            ? String(r.CampaignStartDate).slice(0, 10)
            : null,
          campaignEndDate: r.CampaignEndDate
            ? String(r.CampaignEndDate).slice(0, 10)
            : null,
          displayOrder: Number(r.DisplayOrder ?? 1),
          isActive: Boolean(r.IsActive),
        };
      }),
    });
  }

  return NextResponse.json({ mode, adsEnabled, ads, data: [] });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const section = await getSection(id);
  if (!section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  }

  const mode = resolveSectionItemMode(
    section.DataSourceTable as string | null,
    section.DataSourceKey as string | null,
    section.ComponentKey as string | null
  );
  const key = (section.DataSourceKey as string) || '';
  const body = await request.json();

  try {
    if (mode === 'price_drops' && body.itemType !== 'ads') {
      return NextResponse.json(
        {
          error:
            'Best price drops are auto-loaded from merchant_prices. Change ItemCount on the section instead of adding items.',
        },
        { status: 400 }
      );
    }

    // Ads are always tied to PageSectionId (ImageUrl column)
    if (body.itemType === 'ads') {
      const merchantId = body.merchantId as string;
      const clickUrl = (body.clickUrl as string) || '#';
      const adType = (body.adType as string) || 'Banner';
      if (!merchantId) {
        return NextResponse.json(
          { error: 'merchantId is required for ads' },
          { status: 400 }
        );
      }
      const result = await query(
        `INSERT INTO content.ads_feed
          ("PageSectionId", "MerchantId", "AdType", "Title", "Description",
           "ImageUrl", "VideoUrl", "ClickUrl", "DisplayOrder", "IsActive")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
         RETURNING "Id"`,
        [
          id,
          merchantId,
          adType,
          body.title || null,
          body.description || null,
          body.imageUrl || null,
          body.videoUrl || null,
          clickUrl,
          Number(body.displayOrder ?? 1),
        ]
      );
      return NextResponse.json(
        { data: { id: String((result.rows[0] as { Id: string }).Id) } },
        { status: 201 }
      );
    }

    if (mode === 'product_detail_blocks') {
      if (!key) {
        return NextResponse.json(
          { error: 'Section needs a DataSourceKey before adding products' },
          { status: 400 }
        );
      }
      const productId = body.productId as string;
      if (!productId) {
        return NextResponse.json(
          { error: 'productId is required' },
          { status: 400 }
        );
      }
      const displayOrder = Number(body.displayOrder ?? 1);
      const isSponsored = Boolean(body.isSponsored);
      const sponsoredUrl = isSponsored
        ? ((body.sponsoredUrl as string)?.trim() || null)
        : null;
      const merchantId =
        typeof body.merchantId === 'string' && body.merchantId.trim()
          ? body.merchantId.trim()
          : null;
      const result = await query(
        `INSERT INTO content.product_detail_blocks
          ("ProductId", "VariantId", "DataSourceKey", "DisplayOrder", "IsActive", "IsDeleted", "IsSponsored", "SponsoredUrl", "MerchantId")
         VALUES ($1, $2, $3, $4, true, false, $5, $6, $7)
         RETURNING "Id"`,
        [productId, body.variantId || null, key, displayOrder, isSponsored, sponsoredUrl, merchantId]
      );
      return NextResponse.json(
        { data: { id: String((result.rows[0] as { Id: string }).Id) } },
        { status: 201 }
      );
    }

    if (mode === 'story_feed') {
      // Allow creating with placeholder; image can be uploaded after via /api/images
      const merchantId = body.merchantId as string;
      const image =
        (body.image as string) ||
        'https://placehold.co/600x800/png?text=Upload+image';
      const cta = (body.cta as string) || 'Shop now';
      if (!merchantId) {
        return NextResponse.json(
          { error: 'merchantId is required' },
          { status: 400 }
        );
      }
      const result = await query(
        `INSERT INTO content.story_feed
          ("MerchantId", "Image", "Cta", "StoryUrl", "Duration", "IsDeleted")
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING "Id"`,
        [
          merchantId,
          image,
          cta,
          body.storyUrl || null,
          body.duration ?? null,
        ]
      );
      return NextResponse.json(
        { data: { id: String((result.rows[0] as { Id: string }).Id) } },
        { status: 201 }
      );
    }

    if (mode === 'product_feature_collections') {
      if (!key) {
        return NextResponse.json(
          { error: 'Section needs a DataSourceKey' },
          { status: 400 }
        );
      }
      const title = (body.title as string) || '';
      if (!title) {
        return NextResponse.json(
          { error: 'title is required' },
          { status: 400 }
        );
      }
      const result = await query(
        `INSERT INTO content.product_feature_collections
          ("Title", "ProductId1", "ProductId2", "ProductId3", "ProductId4",
           "DataSourceKey", "DisplayOrder", "ExploreText", "ExploreUrl",
           "IsActive", "IsDeleted")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,false)
         RETURNING "Id"`,
        [
          title,
          body.productId1 || null,
          body.productId2 || null,
          body.productId3 || null,
          body.productId4 || null,
          key,
          Number(body.displayOrder ?? 1),
          body.exploreText || null,
          body.exploreUrl || null,
        ]
      );
      return NextResponse.json(
        { data: { id: String((result.rows[0] as { Id: string }).Id) } },
        { status: 201 }
      );
    }

    if (mode === 'sponsored_products') {
      if (!key) {
        return NextResponse.json(
          { error: 'Section needs a DataSourceKey' },
          { status: 400 }
        );
      }
      const { productId, merchantId, categoryId } = body;
      if (!productId || !merchantId || !categoryId) {
        return NextResponse.json(
          { error: 'productId, merchantId, and categoryId are required' },
          { status: 400 }
        );
      }
      const result = await query(
        `INSERT INTO content.sponsored_products
          ("ProductId", "CategoryId", "MerchantId", "MerchantProductUrl",
           "CampaignStartDate", "CampaignEndDate", "DataSourceKey",
           "DisplayOrder", "IsActive")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
         RETURNING "Id"`,
        [
          productId,
          categoryId,
          merchantId,
          body.merchantProductUrl || null,
          body.campaignStartDate || null,
          body.campaignEndDate || null,
          key,
          Number(body.displayOrder ?? 1),
        ]
      );
      return NextResponse.json(
        { data: { id: String((result.rows[0] as { Id: string }).Id) } },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: `Cannot add items for mode: ${mode}` },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Create failed' },
      { status: 400 }
    );
  }
}
