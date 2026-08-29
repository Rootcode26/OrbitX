import type { DistributionBucket } from "../types";

const tones = {
  critical: "bg-critical",
  high: "bg-high",
  medium: "bg-medium",
  neutral: "bg-[#5a5852]",
};

export function MissDistanceChart({ buckets }: { buckets: DistributionBucket[] }) {
  const maximum = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return (
    <div className="grid h-[220px] grid-cols-6 items-end gap-3 px-4 py-4">
      {buckets.map((bucket) => (
        <div key={bucket.label} className="flex h-full min-w-0 flex-col justify-end">
          <div className="numeric mb-1.5 text-center text-[10.5px] text-text-primary">{bucket.count}</div>
          <div
            className={`w-full ${tones[bucket.tone]}`}
            style={{ height: bucket.count === 0 ? "1px" : `${Math.max((bucket.count / maximum) * 145, 8)}px` }}
          />
          <div className="mt-2.5 text-center text-[9.5px] text-text-tertiary">{bucket.label}</div>
        </div>
      ))}
    </div>
  );
}
