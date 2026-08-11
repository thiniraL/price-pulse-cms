'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import ImageLightbox from '@/components/ImageLightbox';

type Props = {
  images: string[];
  uploadUrl: string;
  disabled?: boolean;
  onChange: (images: string[]) => void;
  onError: (message: string) => void;
};

export default function ProductImagesEditor({
  images,
  uploadUrl,
  disabled,
  onChange,
  onError,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  async function upload(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(uploadUrl, {
        method: 'POST',
        credentials: 'include',
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange((data.data.images as string[]) || [...images, data.data.url]);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function persist(next: string[]) {
    setBusy(true);
    try {
      const res = await apiFetch<{ data: string[] }>(uploadUrl, {
        method: 'PUT',
        body: JSON.stringify({ images: next }),
      });
      onChange(res.data);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Image update failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove(url: string) {
    setBusy(true);
    try {
      const res = await apiFetch<{ data: string[] }>(uploadUrl, {
        method: 'DELETE',
        body: JSON.stringify({ url, deleteFromS3: true }),
      });
      onChange(res.data);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Remove image failed');
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    void persist(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">
          First image is the primary / thumbnail. Upload, reorder, or remove.
        </p>
        <label className="admin-btn admin-btn-secondary cursor-pointer">
          {busy ? 'Working…' : 'Upload image'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled || busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void upload(file);
            }}
          />
        </label>
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No images yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((url, index) => (
            <article
              key={`${url}-${index}`}
              className="overflow-hidden rounded-lg border border-[var(--border)] bg-slate-50"
            >
              <button
                type="button"
                className="block w-full"
                onClick={() => setLightboxIndex(index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Product image ${index + 1}`}
                  className="h-40 w-full object-contain bg-white"
                />
              </button>
              <div className="flex flex-wrap items-center gap-1.5 p-2">
                {index === 0 ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary !px-2 !py-1 text-xs"
                    disabled={disabled || busy}
                    onClick={() => void persist([url, ...images.filter((item) => item !== url)])}
                  >
                    Set primary
                  </button>
                )}
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary !px-2 !py-1 text-xs"
                  disabled={disabled || busy || index === 0}
                  onClick={() => move(index, -1)}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary !px-2 !py-1 text-xs"
                  disabled={disabled || busy || index === images.length - 1}
                  onClick={() => move(index, 1)}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-danger !ml-auto !px-2 !py-1 text-xs"
                  disabled={disabled || busy}
                  onClick={() => void remove(url)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {lightboxIndex !== null ? (
        <ImageLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      ) : null}
    </div>
  );
}
