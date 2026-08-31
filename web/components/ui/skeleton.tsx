export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`skeleton-shimmer rounded-[2px] bg-[var(--well)] ${className}`}
    />
  );
}
