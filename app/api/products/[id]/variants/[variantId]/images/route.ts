import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  appendOwnerImage,
  listOwnerImages,
  removeOwnerImage,
  replaceOwnerImages,
} from '@/lib/productImages';
import { imageDeleteSchema, imagesUpdateSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; variantId: string }> };

function owner(productId: string, variantId: string) {
  return {
    table: 'products.variants' as const,
    id: variantId,
    extraWhere: 'AND "ProductId" = $2',
    extraParams: [productId],
  };
}

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id, variantId } = await params;
  const images = await listOwnerImages(owner(id, variantId));
  if (!images) {
    return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
  }
  return NextResponse.json({ data: images });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id, variantId } = await params;
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  try {
    const result = await appendOwnerImage({
      owner: owner(id, variantId),
      file,
      entityType: 'variant',
      entityId: variantId,
    });
    if (!result) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id, variantId } = await params;
  const parsed = imagesUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 }
    );
  }

  const images = await replaceOwnerImages(
    owner(id, variantId),
    parsed.data.images
  );
  if (!images) {
    return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
  }
  return NextResponse.json({ data: images });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id, variantId } = await params;
  const parsed = imageDeleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 }
    );
  }

  const images = await removeOwnerImage({
    owner: owner(id, variantId),
    url: parsed.data.url,
    deleteFromS3: parsed.data.deleteFromS3 ?? true,
  });
  if (!images) {
    return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
  }
  return NextResponse.json({ data: images });
}
