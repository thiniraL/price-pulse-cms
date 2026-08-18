'use client';

import { ReactNode, useEffect } from 'react';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
};

export default function AdminModal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: Props) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`admin-card relative my-4 w-full max-h-[calc(100vh-2rem)] overflow-y-auto shadow-xl ${
          wide ? 'max-w-3xl' : 'max-w-xl'
        }`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
      >
        <div className="sticky top-0 z-10 mb-4 flex items-start justify-between gap-3 border-b border-[var(--border)] bg-white pb-3">
          <h3 id="admin-modal-title" className="text-lg font-semibold">
            {title}
          </h3>
          <button
            type="button"
            className="admin-btn admin-btn-secondary px-2 py-1 text-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
