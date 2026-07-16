'use client';

type Props = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: Props) {
  if (totalPages <= 1 && total === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--muted)]">
        {total} result{total === 1 ? '' : 's'} · Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
