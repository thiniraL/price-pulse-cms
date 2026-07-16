import { NextRequest, NextResponse } from 'next/server';
import { applySetCookies, proxyBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const proxied = await proxyBackend('/api/Auth/RefreshToken', {
      method: 'POST',
      cookieHeader: request.headers.get('cookie'),
    });

    const res = NextResponse.json(proxied.data, { status: proxied.status });
    return applySetCookies(res, proxied.setCookie);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Refresh failed' },
      { status: 500 }
    );
  }
}
