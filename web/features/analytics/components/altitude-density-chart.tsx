import type { AltitudeDensityBucket } from "../types";

export function AltitudeDensityChart({ buckets }: { buckets: AltitudeDensityBucket[] }) {
  const maximum = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return (
    <div className="space-y-1.5 px-4 py-4">
      {buckets.map((bucket) => (
        <div key={bucket.label} className="grid grid-cols-[72px_minmax(0,1fr)_28px] items-center gap-2">
          <span className="numeric text-right text-[9.5px] text-text-tertiary">{bucket.label}</span>
          <div className="h-2.5 bg-[rgba(228,222,208,.035)]">
            <div
              className={`h-full ${bucket.highlighted ? "bg-high" : "bg-accent"}`}
              style={{ width: `${(bucket.count / maximum) * 100}%` }}
            />
          </div>
          <span className="numeric text-[9.5px] text-text-secondary">{bucket.count}</span>
        </div>
      ))}
    </div>
  );
}
