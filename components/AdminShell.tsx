'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/header', label: 'Header' },
  { href: '/page-sections', label: 'Page sections' },
  { href: '/merchants', label: 'Merchants' },
];

export default function AdminShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-[var(--border)] bg-[#0f1c27] text-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="px-5 py-6">
          <p className="text-xs uppercase tracking-[0.14em] text-white/55">
            Admin
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            PricePulse Manage
          </h1>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col">
          {NAV.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm whitespace-nowrap ${
                  active
                    ? 'bg-white/15 font-semibold'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-white px-4 py-3 sm:px-6">
          <p className="truncate text-sm text-[var(--muted)]">
            {userEmail || 'Signed in'}
          </p>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={logout}>
            Log out
          </button>
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
