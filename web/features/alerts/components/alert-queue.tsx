import type { AlertCounts, AlertSeverity } from "../types";

const rows: { label: AlertSeverity; countKey: keyof AlertCounts; color: string }[] = [
  { label: "CRITICAL", countKey: "critical", color: "bg-critical" },
  { label: "HIGH", countKey: "high", color: "bg-high" },
  { label: "MEDIUM", countKey: "medium", color: "bg-medium" },
  { label: "LOW", countKey: "low", color: "bg-low" },
];

export function AlertQueue({ counts }: { counts: AlertCounts }) {
  return (
    <section className="panel-rise border border-[var(--bd)] bg-surface-1 min-[1240px]:sticky min-[1240px]:top-[70px]">
      <header className="border-b border-[var(--bd)] bg-surface-2 px-3.5 py-[11px]">
        <h2 className="text-[12.5px] font-semibold tracking-[-0.006em]">Queue</h2>
      </header>
      <div className="border-b border-[var(--bd2)] px-3.5 py-4">
        <div className="text-[10.5px] text-text-tertiary">Awaiting acknowledgement</div>
        <div className="numeric mt-2 text-[27px] font-medium text-critical">{counts.unacknowledged}</div>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center border-b border-[var(--bd2)] px-3.5 py-2.5 last:border-b-0">
          <span className={`mr-2.5 h-1.5 w-1.5 ${row.color}`} />
          <span className="numeric text-[9.5px] font-medium tracking-[0.06em] text-text-secondary">{row.label}</span>
          <span className="numeric ml-auto text-[10.5px] font-medium text-text-primary">{counts[row.countKey]}</span>
        </div>
      ))}
    </section>
  );
}

