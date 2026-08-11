export const SUGGESTED_SEARCH_TAGS = ['best_seller', 'new_arrivals'] as const;

function isHttpUrl(value: string) {
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('//')
  );
}

export function parseSearchTags(raw: unknown): string[] {
  if (raw == null || raw === '') return [];

  let value: unknown = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return trimmed
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
  }

  if (Array.isArray(value)) {
    return value
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
}

export function normalizeSearchTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const cleaned = tag.trim().replace(/\s+/g, '_');
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

function collectImageUrls(value: unknown, urls: string[]) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (isHttpUrl(trimmed)) urls.push(trimmed);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectImageUrls(item, urls);
    return;
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === 'string') {
      collectImageUrls(obj.url, urls);
      return;
    }
    if (typeof obj.Url === 'string') {
      collectImageUrls(obj.Url, urls);
      return;
    }
    if (typeof obj.src === 'string') {
      collectImageUrls(obj.src, urls);
      return;
    }
    for (const child of Object.values(obj)) {
      collectImageUrls(child, urls);
    }
  }
}

export function parseImageUrls(raw: unknown): string[] {
  if (raw == null || raw === '') return [];

  let value: unknown = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return isHttpUrl(trimmed) ? [trimmed] : [];
    }
  }

  const urls: string[] = [];
  collectImageUrls(value, urls);
  return [...new Set(urls)];
}

export function serializeSearchTags(tags: string[]): string | null {
  const normalized = normalizeSearchTags(tags);
  return normalized.length ? JSON.stringify(normalized) : null;
}

export function serializeImageUrls(urls: string[]): string | null {
  const cleaned = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  return cleaned.length ? JSON.stringify(cleaned) : null;
}
