import { NextResponse } from 'next/server';
import { getAccessTokenFromCookies, verifyAccessToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const token = await getAccessTokenFromCookies();
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await verifyAccessToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  return NextResponse.json({
    isSuccessful: true,
    data: user,
  });
}
