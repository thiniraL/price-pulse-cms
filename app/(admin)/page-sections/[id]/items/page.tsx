'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import SectionItemsPanel from '@/components/SectionItemsPanel';
import { apiFetch } from '@/lib/api';

export default function SectionItemsPage() {
  const params = useParams();
  const id = String(params.id || '');
  const [title, setTitle] = useState('Section items');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<{ data: { sectionTitle: string } }>(`/api/page-sections/${id}`)
      .then((res) => setTitle(res.data.sectionTitle || 'Section items'))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load section')
      );
  }, [id]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/page-sections" className="admin-btn admin-btn-secondary">
          ← Back to page sections
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      {id ? (
        <SectionItemsPanel
          sectionId={id}
          sectionTitle={title}
          onClose={() => {
            window.location.href = '/page-sections';
          }}
          hideClose
        />
      ) : null}
    </div>
  );
}
