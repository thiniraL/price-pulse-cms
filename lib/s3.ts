import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

function getS3Config() {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || 'ap-south-1';
  if (!bucket) {
    throw new Error('S3_BUCKET is not configured');
  }

  return {
    bucket,
    region,
    publicBaseUrl:
      process.env.S3_PUBLIC_BASE_URL ||
      `https://${bucket}.s3.${region}.amazonaws.com`,
    keyPrefix: (process.env.S3_KEY_PREFIX || 'staging/').replace(/\/?$/, '/'),
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  };
}

function getClient() {
  const config = getS3Config();
  return new S3Client({
    region: config.region,
    credentials:
      config.accessKeyId && config.secretAccessKey
        ? {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          }
        : undefined,
  });
}

function extensionFor(contentType: string, fileName?: string) {
  const fromMime: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  };
  if (fromMime[contentType.toLowerCase()]) {
    return fromMime[contentType.toLowerCase()];
  }
  if (fileName) {
    const ext = fileName.includes('.')
      ? `.${fileName.split('.').pop()?.toLowerCase()}`
      : '';
    if (ext && ext.length <= 5) return ext;
  }
  return '.bin';
}

export function buildPublicUrl(objectKey: string) {
  const { publicBaseUrl } = getS3Config();
  return `${publicBaseUrl.replace(/\/$/, '')}/${objectKey.replace(/^\//, '')}`;
}

export function isHostedUrl(url: string | null | undefined) {
  if (!url) return false;
  const { publicBaseUrl, bucket } = getS3Config();
  if (url.startsWith(publicBaseUrl.replace(/\/$/, ''))) return true;
  return url.includes(bucket);
}

export function keyFromPublicUrl(url: string): string | null {
  if (!isHostedUrl(url)) return null;
  const { publicBaseUrl, bucket, region } = getS3Config();
  const bases = [
    publicBaseUrl.replace(/\/$/, '') + '/',
    `https://${bucket}.s3.${region}.amazonaws.com/`,
    `https://${bucket}.s3.amazonaws.com/`,
  ];
  for (const base of bases) {
    if (url.startsWith(base)) {
      return decodeURIComponent(url.slice(base.length));
    }
  }
  return null;
}

function stripDashes(id: string) {
  return id.replace(/-/g, '');
}

/**
 * Upload image to S3.
 * When sectionId is set, key is:
 *   {prefix}pagesection/{sectionId}/{entityType}/{entityId}/{uuid}.ext
 * Otherwise:
 *   {prefix}{entityType}/{entityId}/{uuid}.ext
 */
export async function uploadImage(options: {
  entityType: string;
  entityId: string;
  bytes: Buffer;
  contentType: string;
  fileName?: string;
  /** Page section folder — groups story/ads images under that section */
  sectionId?: string;
}) {
  const config = getS3Config();
  const client = getClient();
  const ext = extensionFor(options.contentType, options.fileName);
  const entityType = options.entityType.toLowerCase();
  const entityId = stripDashes(options.entityId);
  const fileId = randomUUID().replace(/-/g, '');

  const key = options.sectionId
    ? `${config.keyPrefix}pagesection/${stripDashes(options.sectionId)}/${entityType}/${entityId}/${fileId}${ext}`
    : `${config.keyPrefix}${entityType}/${entityId}/${fileId}${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: options.bytes,
      ContentType: options.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return { key, url: buildPublicUrl(key) };
}

export async function deleteImageByUrl(url: string | null | undefined) {
  const key = url ? keyFromPublicUrl(url) : null;
  if (!key) return false;

  const config = getS3Config();
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );
  return true;
}
