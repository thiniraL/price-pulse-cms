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

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const images = await listOwnerImages({
    table: 'products.products',
    id,
  });
  if (!images) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  return NextResponse.json({ data: images });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  try {
    const result = await appendOwnerImage({
      owner: { table: 'products.products', id },
      file,
      entityType: 'product',
      entityId: id,
    });
    if (!result) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
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

  const { id } = await params;
  const parsed = imagesUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 }
    );
  }

  const images = await replaceOwnerImages(
    { table: 'products.products', id },
    parsed.data.images
  );
  if (!images) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  return NextResponse.json({ data: images });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const parsed = imageDeleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 }
    );
  }

  const images = await removeOwnerImage({
    owner: { table: 'products.products', id },
    url: parsed.data.url,
    deleteFromS3: parsed.data.deleteFromS3 ?? true,
  });
  if (!images) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  return NextResponse.json({ data: images });
}
