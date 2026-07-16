export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { pageSize?: number } = {}
) {
  const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, Number(searchParams.get('pageSize') || defaults.pageSize || 12) || 12)
  );
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

export function paginationMeta(
  total: number,
  page: number,
  pageSize: number
): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
