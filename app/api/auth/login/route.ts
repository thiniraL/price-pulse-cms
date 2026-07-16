import { NextRequest, NextResponse } from 'next/server';
import { applySetCookies, proxyBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email || body.Email;
    const password = body.password || body.Password;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const proxied = await proxyBackend('/api/Auth/Login', {
      method: 'POST',
      body: JSON.stringify({ Email: email, Password: password }),
      cookieHeader: request.headers.get('cookie'),
    });

    if (proxied.status >= 400) {
      const res = NextResponse.json(
        {
          error:
            proxied.data?.Messages?.[0]?.Message ||
            proxied.data?.messages?.[0]?.message ||
            proxied.data?.message ||
            'Login failed',
          ...proxied.data,
        },
        { status: proxied.status }
      );
      return applySetCookies(res, proxied.setCookie);
    }

    const res = NextResponse.json({
      isSuccessful: true,
      ...(typeof proxied.data === 'object' ? proxied.data : {}),
    });
    return applySetCookies(res, proxied.setCookie);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Login failed',
      },
      { status: 500 }
    );
  }
}
