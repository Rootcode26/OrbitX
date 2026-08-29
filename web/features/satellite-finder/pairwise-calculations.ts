export function formatTimeOffset(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `T+${String(hours).padStart(2, "0")}h ${String(remainingMinutes).padStart(2, "0")}m`;
}
