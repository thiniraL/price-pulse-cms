import { deleteImageByUrl, uploadImage } from '@/lib/s3';
import {
  parseImageUrls,
  serializeImageUrls,
} from '@/lib/productMedia';
import { query } from '@/lib/db';

type ImageOwner = {
  table: 'products.products' | 'products.variants';
  id: string;
  extraWhere?: string;
  extraParams?: unknown[];
};

function whereClause(owner: ImageOwner, startIndex: number) {
  if (!owner.extraWhere) return owner.extraWhere || '';
  return owner.extraWhere.replace(/\$2\b/g, `$${startIndex}`);
}

async function loadImages(owner: ImageOwner) {
  const result = await query(
    `SELECT "Images", "OriginalImages"
     FROM ${owner.table}
     WHERE "Id" = $1 ${whereClause(owner, 2)}`,
    [owner.id, ...(owner.extraParams || [])]
  );
  return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
}

async function saveImages(
  owner: ImageOwner,
  nextUrls: string[],
  current: Record<string, unknown>
) {
  const currentJson = current.Images;
  const originalJson = current.OriginalImages;
  const hasOriginal =
    originalJson != null &&
    originalJson !== '' &&
    !(Array.isArray(originalJson) && originalJson.length === 0);

  const preserveOriginal =
    !hasOriginal && currentJson != null && currentJson !== ''
      ? typeof currentJson === 'string'
        ? currentJson
        : JSON.stringify(currentJson)
      : null;

  const serialized = serializeImageUrls(nextUrls);

  await query(
    `UPDATE ${owner.table} SET
      "Images" = $2::jsonb,
      "OriginalImages" = COALESCE("OriginalImages", $3::jsonb),
      updated_at = NOW()
     WHERE "Id" = $1 ${whereClause(owner, 4)}`,
    [owner.id, serialized, preserveOriginal, ...(owner.extraParams || [])]
  );

  return nextUrls;
}

export async function listOwnerImages(owner: ImageOwner) {
  const row = await loadImages(owner);
  if (!row) return null;
  return parseImageUrls(row.Images);
}

export async function replaceOwnerImages(owner: ImageOwner, urls: string[]) {
  const row = await loadImages(owner);
  if (!row) return null;
  return saveImages(owner, urls, row);
}

export async function appendOwnerImage(options: {
  owner: ImageOwner;
  file: File;
  entityType: 'product' | 'variant';
  entityId: string;
}) {
  const row = await loadImages(options.owner);
  if (!row) return null;

  const bytes = Buffer.from(await options.file.arrayBuffer());
  if (bytes.length > 10 * 1024 * 1024) {
    throw new Error('File must be under 10MB');
  }

  const uploaded = await uploadImage({
    entityType: options.entityType,
    entityId: options.entityId,
    bytes,
    contentType: options.file.type || 'application/octet-stream',
    fileName: options.file.name,
  });

  const next = [...parseImageUrls(row.Images), uploaded.url];
  await saveImages(options.owner, next, row);
  return { url: uploaded.url, images: next };
}

export async function removeOwnerImage(options: {
  owner: ImageOwner;
  url: string;
  deleteFromS3: boolean;
}) {
  const row = await loadImages(options.owner);
  if (!row) return null;

  const current = parseImageUrls(row.Images);
  const next = current.filter((image) => image !== options.url);
  await saveImages(options.owner, next, row);

  if (options.deleteFromS3) {
    await deleteImageByUrl(options.url).catch(() => undefined);
  }

  return next;
}
