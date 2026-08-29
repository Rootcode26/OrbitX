import type { ScreeningVolumeBucket } from "../types";

export function ScreeningVolumeChart({ buckets }: { buckets: ScreeningVolumeBucket[] }) {
  const maximum = Math.max(...buckets.map((bucket) => bucket.total), 1);

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-4 text-[10px] text-text-secondary">
        <span><i className="mr-1.5 inline-block h-2 w-2 bg-critical" />Critical</span>
        <span><i className="mr-1.5 inline-block h-2 w-2 bg-high" />High</span>
        <span><i className="mr-1.5 inline-block h-2 w-2 bg-[#4b4944]" />Other</span>
      </div>
      <div className="mt-3 grid h-[190px] items-end gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(buckets.length, 1)}, minmax(0, 1fr))` }}>
        {buckets.map((bucket) => (
          <div key={bucket.label} className="flex h-full min-w-0 flex-col justify-end">
            <div className="numeric mb-1 text-center text-[10px] text-text-secondary">{bucket.total}</div>
            <div className="flex w-full flex-col justify-end" style={{ height: `${Math.max((bucket.total / maximum) * 145, 3)}px` }}>
              <div className="bg-[#4b4944]" style={{ height: `${(bucket.other / Math.max(bucket.total, 1)) * 100}%` }} />
              <div className="bg-high" style={{ height: `${(bucket.high / Math.max(bucket.total, 1)) * 100}%` }} />
              <div className="bg-critical" style={{ height: `${(bucket.critical / Math.max(bucket.total, 1)) * 100}%` }} />
            </div>
            <div className="numeric mt-2 text-center text-[9px] text-text-tertiary">{bucket.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
