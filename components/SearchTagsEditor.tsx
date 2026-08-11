'use client';

import { KeyboardEvent, useMemo, useState } from 'react';

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  disabled?: boolean;
};

export default function SearchTagsEditor({
  value,
  onChange,
  suggestions = [],
  disabled,
}: Props) {
  const [draft, setDraft] = useState('');

  const unusedSuggestions = useMemo(() => {
    const used = new Set(value.map((tag) => tag.toLowerCase()));
    return suggestions.filter((tag) => !used.has(tag.toLowerCase()));
  }, [suggestions, value]);

  function addTag(raw: string) {
    const tag = raw.trim().replace(/\s+/g, '_');
    if (!tag) return;
    const exists = value.some((item) => item.toLowerCase() === tag.toLowerCase());
    if (exists) {
      setDraft('');
      return;
    }
    onChange([...value, tag]);
    setDraft('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    }
    if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No search tags yet.</p>
        ) : (
          value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
            >
              {tag}
              <button
                type="button"
                className="text-emerald-700 hover:text-emerald-950"
                disabled={disabled}
                onClick={() => onChange(value.filter((item) => item !== tag))}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          className="admin-input min-w-[180px] flex-1"
          placeholder="Add tag and press Enter"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          disabled={disabled || !draft.trim()}
          onClick={() => addTag(draft)}
        >
          Add tag
        </button>
      </div>
      {unusedSuggestions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {unusedSuggestions.slice(0, 16).map((tag) => (
            <button
              key={tag}
              type="button"
              className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--fg)]"
              disabled={disabled}
              onClick={() => addTag(tag)}
            >
              + {tag}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
