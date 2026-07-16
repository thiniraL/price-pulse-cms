import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login'];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (pathname.startsWith('/api/auth/login')) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname === '/favicon.ico') return true;
  return false;
}

async function isValidToken(token: string): Promise<boolean> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: process.env.JWT_ISSUER || 'PricePulse',
      audience: process.env.JWT_AUDIENCE || 'PricePulse',
    });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get('AccessToken')?.value ||
    request.cookies.get('accessToken')?.value;

  if (!token || !(await isValidToken(token))) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
