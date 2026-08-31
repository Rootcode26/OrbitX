import type { RankedCountMetric } from "../types";

const tones = {
  accent: "bg-accent",
  active: "bg-accent",
  inactive: "bg-[var(--object-inactive)]",
  unknown: "bg-[#5a5852]",
};

export function RankedCountChart({ metrics }: { metrics: RankedCountMetric[] }) {
  return (
    <div className="divide-y divide-[var(--bd2)] px-4 py-2">
      {metrics.map((metric, index) => (
        <div key={metric.label} className="chart-reveal grid grid-cols-[24px_minmax(0,1fr)_76px] items-center gap-3 py-2.5" style={{ animationDelay: `${index * 35}ms` }}>
          <span className="numeric text-[9px] text-text-tertiary">{String(index + 1).padStart(2, "0")}</span>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-[10.5px] text-text-secondary">{metric.label}</span>
              <span className="numeric shrink-0 text-[9px] text-text-tertiary">{metric.percentage.toFixed(1)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-[rgba(228,222,208,.035)]">
              <div className={`chart-grow-x h-full ${tones[metric.tone]}`} style={{ width: `${Math.min(100, metric.percentage)}%`, animationDelay: `${70 + index * 35}ms` }} />
            </div>
          </div>
          <span className="numeric text-right text-[10.5px] font-medium text-text-primary">{metric.count.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
