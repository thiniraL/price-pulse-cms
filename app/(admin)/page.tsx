import Link from 'next/link';

const cards = [
  {
    href: '/header',
    title: 'Header navigation',
    text: 'Manage top-level and sub-navigation items shown on the storefront.',
  },
  {
    href: '/page-sections',
    title: 'Page sections',
    text: 'Configure home and other page section order, titles, and component keys.',
  },
  {
    href: '/merchants',
    title: 'Merchants',
    text: 'Create and edit merchants, and upload or replace logos in S3.',
  },
];

export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Content and merchant admin for PricePulse. Changes write to the shared
        database used by the public site.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="admin-card transition hover:border-[var(--accent)]"
          >
            <h3 className="text-lg font-semibold">{card.title}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{card.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
