/**
 * Proxy helpers for PricePulseSL auth endpoints.
 * Forwards cookies in both directions so AccessToken / RefreshToken work.
 */

export function getApiBaseUrl() {
  return (process.env.API_BASE_URL || 'http://api.pricepulse.lk').replace(
    /\/$/,
    ''
  );
}

export async function proxyBackend(
  path: string,
  init: {
    method?: string;
    body?: string;
    cookieHeader?: string | null;
  } = {}
) {
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (init.cookieHeader) {
    headers.Cookie = init.cookieHeader;
  }

  const response = await fetch(url, {
    method: init.method || 'POST',
    headers,
    body: init.body,
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') || '';
  const rawText = contentType.includes('application/json')
    ? null
    : await response.text();
  const data = rawText === null ? await response.json() : { message: rawText };

  return {
    status: response.status,
    data,
    setCookie: response.headers.getSetCookie?.() || [],
  };
}

/** Turn backend/proxy failures into a short user-facing message. */
export function backendErrorMessage(
  status: number,
  data: unknown,
  fallback = 'Request failed'
): string {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const nested =
      (Array.isArray(d.Messages) &&
        (d.Messages[0] as { Message?: string })?.Message) ||
      (Array.isArray(d.messages) &&
        (d.messages[0] as { message?: string })?.message) ||
      (typeof d.message === 'string' ? d.message : null) ||
      (typeof d.error === 'string' ? d.error : null);

    if (nested && !looksLikeHtml(nested)) {
      return nested;
    }
  }

  if (status === 404) {
    const base = getApiBaseUrl();
    return `Auth API not found (404). Check API_BASE_URL on Vercel — use http://api.pricepulse.lk (HTTPS returns 404). Current: ${base}`;
  }

  if (status >= 500) {
    return 'PricePulse backend is unavailable. Try again shortly.';
  }

  return fallback;
}

function looksLikeHtml(value: string): boolean {
  const t = value.trim();
  return t.startsWith('<!DOCTYPE') || t.startsWith('<html') || t.startsWith('<HTML');
}

export function applySetCookies(
  nextResponse: import('next/server').NextResponse,
  setCookies: string[]
) {
  for (const cookie of setCookies) {
    nextResponse.headers.append('Set-Cookie', cookie);
  }
  return nextResponse;
}
