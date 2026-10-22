import { useEffect, useMemo, useState } from 'react';

export const DEFAULT_PAGE_SIZE = 25;

/**
 * Splits `items` into pages. Goes back to page 1 whenever `resetKey` changes (e.g. a new search
 * or filter), and stays within range when the list shrinks.
 */
export function usePagination<T>(items: T[], resetKey: unknown = null, pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(Math.ceil(items.length / pageSize), 1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const current = Math.min(page, pageCount);
  const pageItems = useMemo(() => items.slice((current - 1) * pageSize, current * pageSize), [items, current, pageSize]);

  return {
    page: current,
    pageCount,
    pageItems,
    setPage,
    /** 1-based index of the first row shown (0 when empty). */
    from: items.length === 0 ? 0 : (current - 1) * pageSize + 1,
    to: Math.min(current * pageSize, items.length),
    total: items.length,
  };
}
