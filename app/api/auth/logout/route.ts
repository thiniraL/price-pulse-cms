import { NextRequest, NextResponse } from 'next/server';
import { applySetCookies, proxyBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const proxied = await proxyBackend('/api/Auth/Logout', {
      method: 'POST',
      cookieHeader: request.headers.get('cookie'),
    });

    const res = NextResponse.json(
      proxied.data || { isSuccessful: true },
      { status: proxied.status }
    );
    applySetCookies(res, proxied.setCookie);
    res.headers.append(
      'Set-Cookie',
      'AccessToken=; Path=/; Max-Age=0; HttpOnly'
    );
    res.headers.append(
      'Set-Cookie',
      'RefreshToken=; Path=/; Max-Age=0; HttpOnly'
    );
    return res;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Logout failed' },
      { status: 500 }
    );
  }
}
