import type { OperationsDataSource } from "../types";

function SourceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-[var(--bd2)] px-4 py-3 last:border-r-0">
      <div className="text-[10px] font-medium text-text-tertiary">{label}</div>
      <div className="numeric mt-1.5 text-[13px] font-medium text-text-primary">{value}</div>
    </div>
  );
}

export function DataSourceCard({ source }: { source: OperationsDataSource }) {
  return (
    <article className="panel-rise border border-[var(--bd)] bg-surface-1">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--bd)] bg-surface-2 px-4 py-3.5">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold tracking-[-0.006em] text-text-primary">{source.name}</h2>
          <p className="mt-1 text-[10px] text-text-tertiary">{source.description}</p>
        </div>
      </header>
      <div className="grid grid-cols-3">
        <SourceMetric label="Last sync" value={source.lastSync} />
        <SourceMetric label="Records" value={source.records.toLocaleString()} />
        <SourceMetric label="Next sync" value={source.nextSync} />
      </div>
      <footer className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] gap-4 border-t border-[var(--bd2)] px-4 py-2.5 text-[9.5px] text-text-tertiary">
        <span className="numeric truncate">{source.endpoint}</span>
        <span className="numeric truncate text-right">cadence {source.cadence} · {source.detail}</span>
      </footer>
    </article>
  );
}
