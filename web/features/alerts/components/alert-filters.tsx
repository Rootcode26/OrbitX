import type { AlertCounts, AlertFilter } from "../types";

const tabs: { label: string; value: AlertFilter; countKey: keyof AlertCounts }[] = [
  { label: "ALL", value: "ALL", countKey: "all" },
  { label: "CRITICAL", value: "CRITICAL", countKey: "critical" },
  { label: "HIGH", value: "HIGH", countKey: "high" },
  { label: "MEDIUM", value: "MEDIUM", countKey: "medium" },
  { label: "RESOLVED", value: "RESOLVED", countKey: "resolved" },
];

export function AlertFilters({
  filter,
  counts,
  onChange,
}: {
  filter: AlertFilter;
  counts: AlertCounts;
  onChange: (filter: AlertFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--bd)] bg-surface-2 px-3.5 py-2.5">
      {tabs.map((tab) => {
        const active = filter === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`numeric h-[28px] whitespace-nowrap border px-2.5 text-[8px] font-semibold tracking-[0.05em] transition-colors duration-150 ${active ? "border-[var(--acc-border)] bg-[var(--acc-tint)] text-[var(--acc-text)]" : "border-[var(--bd)] text-text-tertiary hover:border-[var(--acc-border)] hover:text-text-primary"}`}
          >
            {tab.label} {counts[tab.countKey]}
          </button>
        );
      })}
    </div>
  );
}

