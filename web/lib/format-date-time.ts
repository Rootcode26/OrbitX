function parseDate(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const hasDateTime = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(value);
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  const normalized = hasDateTime && !hasZone ? `${value.replace(" ", "T")}Z` : value;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLocalClock(value: string | Date, includeSeconds = false): string {
  const date = parseDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
    hour12: true,
  }).format(date);
}

export function formatLocalDateTime(value: string | Date): string {
  const date = parseDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
