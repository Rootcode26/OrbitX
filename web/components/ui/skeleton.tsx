export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-[2px] bg-[var(--well)] ${className}`}
    />
  );
}
