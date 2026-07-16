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
  const data = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() };

  return {
    status: response.status,
    data,
    setCookie: response.headers.getSetCookie?.() || [],
  };
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
