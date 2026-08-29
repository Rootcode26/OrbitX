import { formatLocalClock, formatLocalDateTime as formatDateTime } from "@/lib/format-date-time";

export function formatDistance(distanceKm: number | null) {
  if (distanceKm === null) return "—";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  if (distanceKm < 10) return `${distanceKm.toFixed(2)} km`;
  return `${distanceKm.toFixed(1)} km`;
}

export function formatLocalDateTime(value: string | null) {
  if (!value) return "TCA unavailable";
  return formatDateTime(value);
}

export function formatComputedTime(value: string) {
  return formatLocalClock(value, true);
}
