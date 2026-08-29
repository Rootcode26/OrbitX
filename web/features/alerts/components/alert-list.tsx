import Link from "next/link";
import { formatLocalClock } from "@/lib/format-date-time";
import { AlertSeverityBadge } from "./alert-severity-badge";
import type { OperationsAlert } from "../types";

export function AlertList({
  alerts,
  onAcknowledge,
}: {
  alerts: OperationsAlert[];
  onAcknowledge: (alertId: string) => void;
}) {
  return (
    <div>
      {alerts.map((alert) => (
        <article
          key={alert.id}
          className={`grid min-h-[112px] grid-cols-[minmax(0,1fr)_116px] gap-4 border-b border-[var(--bd2)] px-4 py-3.5 ${alert.resolved ? "opacity-55" : ""}`}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <AlertSeverityBadge severity={alert.severity} />
              <span className="numeric text-[9.5px] text-text-tertiary">{formatLocalClock(alert.occurredAt, true)}</span>
              <span className="text-[9.5px] text-text-tertiary">·</span>
              <span className="text-[10px] text-text-tertiary">{alert.source}</span>
              {alert.resolved ? (
                <span className="numeric border border-[var(--bd)] px-1.5 py-1 text-[8px] text-text-tertiary">RESOLVED</span>
              ) : null}
            </div>
            <h2 className="mt-2 text-[12.5px] font-medium text-text-primary">{alert.title}</h2>
            <p className="mt-1.5 max-w-[860px] text-[11.5px] leading-[1.55] text-text-secondary">{alert.description}</p>
          </div>
          <div className="flex flex-col items-stretch gap-1.5">
            {alert.conjunctionEventId ? (
              <Link
                href={`/conjunctions?event=${encodeURIComponent(alert.conjunctionEventId)}`}
                className="flex h-[30px] items-center justify-center border border-[var(--acc-border)] text-[10.5px] font-medium text-[var(--acc-text)] transition-colors hover:border-[var(--acc)] hover:text-[var(--acc-hover)]"
              >
                Inspect
              </Link>
            ) : null}
            <button
              disabled={alert.acknowledged}
              onClick={() => onAcknowledge(alert.id)}
              className="h-[30px] border border-[var(--bd)] text-[10.5px] font-medium text-text-secondary transition-colors hover:border-[var(--acc-border)] hover:text-text-primary disabled:cursor-default disabled:opacity-45"
            >
              {alert.acknowledged ? "Acknowledged" : "Acknowledge"}
            </button>
          </div>
        </article>
      ))}
      {alerts.length === 0 ? (
        <div className="px-4 py-12 text-center text-[11px] text-text-tertiary">No alerts match this filter.</div>
      ) : null}
    </div>
  );
}
