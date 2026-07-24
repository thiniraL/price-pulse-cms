import Link from 'next/link';

const cards = [
  {
    href: '/analytics',
    title: 'Search analytics',
    text: 'Charts for search volume, top queries, and zero-result demand by day, month, year, or custom range.',
  },
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
  {
    href: '/feedback',
    title: 'Feedback',
    text: 'Review user feedback messages and open attached screenshots in full view.',
  },
];

export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Content, merchant admin, and search demand analytics for PricePulse.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
