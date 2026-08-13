export const TABLE_SORT_VALUES = [
  "created_desc",
  "created_asc",
  "nome_asc",
  "nome_desc",
] as const;

export type TableSort = (typeof TABLE_SORT_VALUES)[number];

export const TABLE_SORT_OPTIONS: Array<{ value: TableSort; label: string }> = [
  { value: "created_desc", label: "Criação (mais recentes)" },
  { value: "created_asc", label: "Criação (mais antigos)" },
  { value: "nome_asc", label: "Alfabética (A–Z)" },
  { value: "nome_desc", label: "Alfabética (Z–A)" },
];

export const DEFAULT_TABLE_SORT: TableSort = "created_desc";

export function isTableSort(value: string | null | undefined): value is TableSort {
  return TABLE_SORT_VALUES.includes(value as TableSort);
}

export function sortByTableOrder<T>(
  items: readonly T[],
  sort: TableSort,
  getName: (item: T) => string | null | undefined,
  getCreated: (item: T) => string | number | Date | null | undefined,
): T[] {
  const createdMs = (item: T) => {
    const value = getCreated(item);
    if (value == null || value === "") return 0;
    const time = typeof value === "number" ? value : new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  };

  return [...items].sort((a, b) => {
    if (sort === "nome_asc" || sort === "nome_desc") {
      const cmp = (getName(a) ?? "").localeCompare(getName(b) ?? "", "pt-BR", {
        sensitivity: "base",
      });
      return sort === "nome_asc" ? cmp : -cmp;
    }
    const cmp = createdMs(a) - createdMs(b);
    return sort === "created_asc" ? cmp : -cmp;
  });
}
