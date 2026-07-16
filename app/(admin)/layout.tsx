import { redirect } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { getAccessTokenFromCookies, verifyAccessToken } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getAccessTokenFromCookies();
  const user = token ? await verifyAccessToken(token) : null;

  if (!user) {
    redirect('/login');
  }

  return <AdminShell userEmail={user.email}>{children}</AdminShell>;
}
