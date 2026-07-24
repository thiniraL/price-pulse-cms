export type FeedbackRow = {
  id: string;
  message: string;
  email: string | null;
  pageUrl: string | null;
  userAgent: string | null;
  screenshots: string[];
  productId: string | null;
  productName: string | null;
  merchantId: string | null;
  merchantName: string | null;
  createdAt: string;
  screenshotCount: number;
};

function parseScreenshots(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    // Already a URL (or data URL) stored as a plain string
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:')
    ) {
      return [trimmed];
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (v): v is string => typeof v === 'string' && v.trim().length > 0
        );
      }
      if (typeof parsed === 'string' && parsed.trim()) {
        return [parsed.trim()];
      }
    } catch {
      return [];
    }
  }

  return [];
}

export function mapFeedback(row: Record<string, unknown>): FeedbackRow {
  const screenshots = parseScreenshots(row.Screenshots);
  return {
    id: String(row.Id),
    message: String(row.Message ?? ''),
    email: (row.Email as string) ?? null,
    pageUrl: (row.PageUrl as string) ?? null,
    userAgent: (row.UserAgent as string) ?? null,
    screenshots,
    productId: row.ProductId ? String(row.ProductId) : null,
    productName: (row.ProductName as string) ?? null,
    merchantId: row.MerchantId ? String(row.MerchantId) : null,
    merchantName: (row.MerchantName as string) ?? null,
    createdAt: String(row.created_at ?? row.CreatedAt ?? ''),
    screenshotCount: screenshots.length,
  };
}

export function truncateMessage(message: string, max = 100) {
  const trimmed = message.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

export function formatFeedbackDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
