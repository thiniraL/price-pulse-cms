'use client';

import { useEffect } from 'react';

type ImageLightboxProps = {
  images: string[];
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
};

export default function ImageLightbox({
  images,
  index,
  onClose,
  onChange,
}: ImageLightboxProps) {
  const current = images[index];
  const hasMultiple = images.length > 1;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasMultiple) {
        onChange((index - 1 + images.length) % images.length);
      }
      if (e.key === 'ArrowRight' && hasMultiple) {
        onChange((index + 1) % images.length);
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [hasMultiple, images.length, index, onChange, onClose]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot full view"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-lg bg-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/25"
        onClick={onClose}
      >
        Close
      </button>

      {hasMultiple ? (
        <>
          <button
            type="button"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg bg-white/15 px-3 py-2 text-white hover:bg-white/25 sm:left-6"
            onClick={(e) => {
              e.stopPropagation();
              onChange((index - 1 + images.length) % images.length);
            }}
            aria-label="Previous screenshot"
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-white/15 px-3 py-2 text-white hover:bg-white/25 sm:right-6"
            onClick={(e) => {
              e.stopPropagation();
              onChange((index + 1) % images.length);
            }}
            aria-label="Next screenshot"
          >
            ›
          </button>
        </>
      ) : null}

      <div
        className="flex max-h-full max-w-6xl flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={`Screenshot ${index + 1}`}
          className="max-h-[82vh] max-w-full rounded-lg object-contain shadow-2xl"
        />
        <div className="flex items-center gap-3 text-sm text-white/80">
          <span>
            {index + 1} / {images.length}
          </span>
          <a
            href={current}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-white"
          >
            Open original
          </a>
        </div>
      </div>
    </div>
  );
}
