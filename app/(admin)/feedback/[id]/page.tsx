'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import ImageLightbox from '@/components/ImageLightbox';
import { FeedbackRow, formatFeedbackDate } from '@/lib/feedback';

export default function FeedbackDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [item, setItem] = useState<FeedbackRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: FeedbackRow }>(`/api/feedback/${id}`);
      setItem(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/feedback"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ← Back to feedback
          </Link>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Feedback detail
          </h2>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : !item ? (
        <p className="text-sm text-[var(--muted)]">Feedback not found.</p>
      ) : (
        <>
          <div className="admin-card space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Meta label="Submitted" value={formatFeedbackDate(item.createdAt)} />
              <Meta label="Email" value={item.email || '—'} />
              <Meta
                label="Page URL"
                value={
                  item.pageUrl ? (
                    <a
                      href={item.pageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-[var(--accent)] underline"
                    >
                      {item.pageUrl}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <Meta label="Product" value={item.productName || '—'} />
              <Meta label="Merchant" value={item.merchantName || '—'} />
              <Meta
                label="User agent"
                value={
                  <span className="break-all text-xs text-[var(--muted)]">
                    {item.userAgent || '—'}
                  </span>
                }
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Message
              </p>
              <p className="mt-2 break-words whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]">
                {item.message}
              </p>
            </div>
          </div>

          <div className="admin-card space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Screenshots</h3>
              <p className="text-sm text-[var(--muted)]">
                {item.screenshots.length} attached
              </p>
            </div>

            {item.screenshots.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No screenshots.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {item.screenshots.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    className="group overflow-hidden rounded-xl border border-[var(--border)] bg-[#f8fafc] text-left transition hover:border-[var(--accent)]"
                    onClick={() => setLightboxIndex(index)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Screenshot ${index + 1}`}
                      className="aspect-video w-full object-cover object-top"
                    />
                    <div className="flex items-center justify-between px-3 py-2 text-xs text-[var(--muted)]">
                      <span>Screenshot {index + 1}</span>
                      <span className="font-medium text-[var(--accent)] group-hover:underline">
                        View full
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {item && lightboxIndex !== null ? (
        <ImageLightbox
          images={item.screenshots}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      ) : null}
    </div>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <div className="mt-1 break-words text-sm [overflow-wrap:anywhere]">{value}</div>
    </div>
  );
}
