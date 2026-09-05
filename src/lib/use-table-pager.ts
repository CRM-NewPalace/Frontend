import { useEffect, useMemo, useState } from "react";

export const TABLE_PAGE_SIZE = 20;

/** Paginação de listas já carregadas — 20 linhas por página. */
export function useTablePager<T>(items: T[], resetKey?: string | number) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    setPage((current) => Math.min(Math.max(1, current), totalPages));
  }, [totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * TABLE_PAGE_SIZE;
    return items.slice(start, start + TABLE_PAGE_SIZE);
  }, [items, page]);

  return {
    page,
    setPage,
    totalPages,
    pageItems,
    total,
    pageSize: TABLE_PAGE_SIZE,
  };
}
