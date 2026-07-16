import type { Paginated } from './types';

/** The backend caps `limit` at 100 per request, so full-period reports page through everything. */
const PAGE_SIZE = 100;

export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<Paginated<T>>,
): Promise<T[]> {
  const first = await fetchPage(1, PAGE_SIZE);
  const items = [...first.data];
  for (let page = 2; page <= first.meta.totalPages; page++) {
    const next = await fetchPage(page, PAGE_SIZE);
    items.push(...next.data);
  }
  return items;
}
