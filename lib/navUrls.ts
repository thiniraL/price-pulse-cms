/**
 * Header / sub-nav slugs → storefront listing URLs.
 * Examples:
 *   phones                         → /phones
 *   ASUS                           → /phones?brand=ASUS
 *   brand=ASUS                     → /phones?brand=ASUS
 *   /home-appliances?brand=Air+Conditioners
 */

function trimSlug(value: string | null | undefined): string {
  return String(value || '').trim();
}

export function listingPathFromSlug(slug: string | null | undefined): string {
  const raw = trimSlug(slug);
  if (!raw || raw === '#') return '#';

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      return `${url.pathname}${url.search}` || '/';
    } catch {
      return raw;
    }
  }

  if (raw.startsWith('/')) return raw;
  return `/${raw.replace(/^\/+/, '')}`;
}

export function subNavListingHref(
  parentSlug: string | null | undefined,
  subSlug: string | null | undefined,
  subName: string | null | undefined
): string {
  const parent = listingPathFromSlug(parentSlug);
  const parentPath = parent === '#' ? '' : parent.split('?')[0];
  const raw = trimSlug(subSlug);

  if (raw && (/^https?:\/\//i.test(raw) || raw.startsWith('/'))) {
    return listingPathFromSlug(raw);
  }

  if (raw.startsWith('?')) {
    return parentPath ? `${parentPath}${raw}` : raw;
  }

  if (raw.includes('=')) {
    return parentPath ? `${parentPath}?${raw.replace(/^\?/, '')}` : `?${raw.replace(/^\?/, '')}`;
  }

  const value = trimSlug(subName) || raw.replace(/\+/g, ' ');
  if (!parentPath || !value) return parentPath || '#';

  const params = new URLSearchParams();
  params.set('brand', value);
  return `${parentPath}?${params.toString()}`;
}
