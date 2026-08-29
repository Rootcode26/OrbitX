import type { RiskDistributionMetric } from "../types";

const tones = {
  CRITICAL: "bg-critical",
  HIGH: "bg-high",
  MEDIUM: "bg-medium",
  LOW: "bg-low",
};

export function RiskDistributionChart({ metrics }: { metrics: RiskDistributionMetric[] }) {
  return (
    <div className="px-4 py-4">
      <div className="flex h-3 overflow-hidden">
        {metrics.map((metric) => (
          <div key={metric.level} className={tones[metric.level]} style={{ width: `${metric.percentage}%` }} />
        ))}
      </div>
      <div className="mt-3 divide-y divide-[var(--bd2)] border-t border-[var(--bd2)]">
        {metrics.map((metric) => (
          <div key={metric.level} className="grid grid-cols-[minmax(0,1fr)_80px_28px] items-center py-2">
            <span className="flex items-center gap-2 text-[10.5px] text-text-secondary">
              <i className={`h-2 w-2 ${tones[metric.level]}`} />
              {metric.level}
            </span>
            <span className="numeric text-right text-[10px] text-text-tertiary">{metric.percentage.toFixed(1)}%</span>
            <span className="numeric text-right text-[10.5px] font-medium text-text-primary">{metric.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
