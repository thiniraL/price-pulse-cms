import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

const ROLE_CLAIM =
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const NAME_ID_CLAIM =
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';
const NAME_CLAIM =
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name';
const EMAIL_CLAIM =
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';

export type AuthUser = {
  userId: string;
  userName: string | null;
  email: string | null;
  roles: string[];
};

/** @deprecated Use AuthUser */
export type AdminUser = AuthUser;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return new TextEncoder().encode(secret);
}

export function extractRoles(payload: Record<string, unknown>): string[] {
  const raw = payload[ROLE_CLAIM] ?? payload.role ?? payload.roles;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  return [String(raw)];
}

export async function verifyAccessToken(
  token: string
): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: process.env.JWT_ISSUER || 'PricePulse',
      audience: process.env.JWT_AUDIENCE || 'PricePulse',
    });

    const data = payload as Record<string, unknown>;
    const userId = String(
      data[NAME_ID_CLAIM] ?? data.nameid ?? data.sub ?? ''
    );
    if (!userId) return null;

    const roles = extractRoles(data);
    return {
      userId,
      userName: (data[NAME_CLAIM] ?? data.unique_name ?? data.name ?? null) as
        | string
        | null,
      email: (data[EMAIL_CLAIM] ?? data.email ?? null) as string | null,
      roles,
    };
  } catch {
    return null;
  }
}

export async function getAccessTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return (
    store.get('AccessToken')?.value ||
    store.get('accessToken')?.value ||
    store.get('access_token')?.value ||
    null
  );
}

/** Any authenticated user (no Admin role required). */
export async function requireAuth(): Promise<
  { user: AuthUser } | { error: NextResponse }
> {
  const token = await getAccessTokenFromCookies();
  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      ),
    };
  }

  const user = await verifyAccessToken(token);
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
    };
  }

  return { user };
}

/** @deprecated Use requireAuth — kept for existing API routes. */
export async function requireAdmin() {
  return requireAuth();
}
