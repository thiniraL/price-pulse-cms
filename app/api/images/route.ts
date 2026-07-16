import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { deleteImageByUrl, uploadImage } from '@/lib/s3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST multipart fields:
 * - file (required)
 * - entityType: merchant | story | ads (default merchant)
 * - entityId: merchant id, story_feed id, or ads_feed id
 * - sectionId: optional — puts file under pagesection/{sectionId}/...
 * - replacePrevious: "true" to delete previousUrl from S3
 * - previousUrl: old image URL
 * - updateDb: "true" (default) — write URL into LogoUrl / Image / ImageUrl
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const form = await request.formData();
    const file = form.get('file');
    const entityType = String(form.get('entityType') || 'merchant').toLowerCase();
    const entityId = String(form.get('entityId') || '');
    const sectionId = form.get('sectionId')
      ? String(form.get('sectionId'))
      : undefined;
    const replacePrevious = String(form.get('replacePrevious') || '') === 'true';
    const previousUrl = form.get('previousUrl')
      ? String(form.get('previousUrl'))
      : null;
    const updateDb = String(form.get('updateDb') ?? 'true') !== 'false';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (!entityId) {
      return NextResponse.json(
        { error: 'entityId is required' },
        { status: 400 }
      );
    }
    if ((entityType === 'story' || entityType === 'ads') && !sectionId) {
      return NextResponse.json(
        { error: 'sectionId is required for story/ads uploads' },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File must be under 10MB' },
        { status: 400 }
      );
    }

    const uploaded = await uploadImage({
      entityType,
      entityId,
      sectionId,
      bytes,
      contentType: file.type || 'application/octet-stream',
      fileName: file.name,
    });

    if (updateDb) {
      if (entityType === 'merchant') {
        const existing = await query(
          `SELECT "LogoUrl", "OriginalLogoUrl" FROM merchants.merchants WHERE "Id" = $1`,
          [entityId]
        );
        if (existing.rows[0]) {
          const row = existing.rows[0] as Record<string, unknown>;
          let original = (row.OriginalLogoUrl as string) ?? null;
          const currentLogo = (row.LogoUrl as string) ?? null;
          if (!original && currentLogo && currentLogo !== uploaded.url) {
            original = currentLogo;
          }
          await query(
            `UPDATE merchants.merchants
             SET "LogoUrl" = $2, "OriginalLogoUrl" = $3, "UpdatedAt" = NOW()
             WHERE "Id" = $1`,
            [entityId, uploaded.url, original]
          );
        }
      } else if (entityType === 'story') {
        const result = await query(
          `UPDATE content.story_feed
           SET "Image" = $2, "UpdatedAt" = NOW()
           WHERE "Id" = $1 AND "IsDeleted" = false
           RETURNING "Id"`,
          [entityId, uploaded.url]
        );
        if (!result.rows[0]) {
          return NextResponse.json(
            { error: 'Story item not found' },
            { status: 404 }
          );
        }
      } else if (entityType === 'ads') {
        const result = await query(
          `UPDATE content.ads_feed
           SET "ImageUrl" = $2, "UpdatedAt" = NOW()
           WHERE "Id" = $1
           RETURNING "Id"`,
          [entityId, uploaded.url]
        );
        if (!result.rows[0]) {
          return NextResponse.json(
            { error: 'Ad item not found' },
            { status: 404 }
          );
        }
      }
    }

    if (replacePrevious && previousUrl && previousUrl !== uploaded.url) {
      await deleteImageByUrl(previousUrl).catch(() => undefined);
    }

    return NextResponse.json({
      data: { url: uploaded.url, key: uploaded.key },
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const url = body.url as string | undefined;
    const merchantId = body.merchantId as string | undefined;
    const storyId = body.storyId as string | undefined;
    const adsId = body.adsId as string | undefined;

    if (!url && !merchantId && !storyId && !adsId) {
      return NextResponse.json(
        { error: 'url, merchantId, storyId, or adsId required' },
        { status: 400 }
      );
    }

    let imageUrl = url || null;

    if (merchantId) {
      const existing = await query(
        `SELECT "LogoUrl" FROM merchants.merchants WHERE "Id" = $1`,
        [merchantId]
      );
      if (!existing.rows[0]) {
        return NextResponse.json(
          { error: 'Merchant not found' },
          { status: 404 }
        );
      }
      imageUrl =
        url ||
        ((existing.rows[0] as Record<string, unknown>).LogoUrl as string);
      await query(
        `UPDATE merchants.merchants
         SET "LogoUrl" = NULL, "UpdatedAt" = NOW()
         WHERE "Id" = $1`,
        [merchantId]
      );
    }

    if (storyId) {
      const existing = await query(
        `SELECT "Image" FROM content.story_feed WHERE "Id" = $1`,
        [storyId]
      );
      if (!existing.rows[0]) {
        return NextResponse.json(
          { error: 'Story not found' },
          { status: 404 }
        );
      }
      imageUrl =
        url || ((existing.rows[0] as Record<string, unknown>).Image as string);
      // Image is required on story — keep a placeholder empty string not allowed;
      // leave URL cleared only via replace; for delete we soft-delete the story instead.
      await query(
        `UPDATE content.story_feed
         SET "IsDeleted" = true, "DeletedAt" = NOW(), "UpdatedAt" = NOW()
         WHERE "Id" = $1`,
        [storyId]
      );
    }

    if (adsId) {
      const existing = await query(
        `SELECT "ImageUrl" FROM content.ads_feed WHERE "Id" = $1`,
        [adsId]
      );
      if (!existing.rows[0]) {
        return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
      }
      imageUrl =
        url ||
        ((existing.rows[0] as Record<string, unknown>).ImageUrl as string);
      await query(
        `UPDATE content.ads_feed
         SET "ImageUrl" = NULL, "UpdatedAt" = NOW()
         WHERE "Id" = $1`,
        [adsId]
      );
    }

    if (imageUrl) {
      await deleteImageByUrl(imageUrl).catch(() => undefined);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
