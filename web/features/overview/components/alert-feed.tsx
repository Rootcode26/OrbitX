"use client";

import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLocalClock } from "@/lib/format-date-time";
import { useAlerts } from "@/features/alerts/hooks/use-alerts";
import { useAcknowledgeAlert } from "@/features/alerts/hooks/use-alert-actions";
import type { RiskLevel } from "../types";

const text: Record<RiskLevel, string> = {
  CRITICAL: "text-critical",
  HIGH: "text-high",
  MEDIUM: "text-medium",
  LOW: "text-low",
};

export function AlertFeed() {
  const alerts = useAlerts({ limit: 5 });
  const acknowledge = useAcknowledgeAlert();
  const items = alerts.data?.alerts ?? [];

  return (
    <Panel title="Alert feed" meta={<Link href="/alerts" className="text-accent hover:text-[var(--acc-hover)]">Center</Link>}>
      {alerts.isPending ? (
        <div className="space-y-2 p-3.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : alerts.isError ? (
        <EmptyState
          tone="error"
          title="Unable to load alerts"
          description="The alerts service could not be reached."
        />
      ) : items.length === 0 ? (
        <EmptyState title="No active alerts" description="No operational alerts have been raised." />
      ) : (
        <div>
          {items.map((alert) => (
            <button
              key={alert.id}
              onClick={() => !alert.acknowledged && acknowledge.mutate(alert.id)}
              disabled={alert.acknowledged || acknowledge.isPending}
              className={`block w-full border-b border-[var(--bd2)] px-3.5 py-3 text-left transition-colors duration-120 hover:bg-surface-3 ${alert.acknowledged ? "opacity-45" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className={`numeric text-[8.5px] font-semibold tracking-[0.12em] ${text[alert.severity]}`}>{alert.severity}</span>
                <span className="numeric text-[8.5px] text-text-tertiary">{formatLocalClock(alert.created_at, true)}</span>
                {alert.acknowledged ? <span className="numeric border border-[var(--bd)] px-1 py-0.5 text-[8px] text-text-tertiary">ACK</span> : null}
              </div>
              <div className="mt-2 text-[12.5px] font-medium text-text-primary">{alert.title}</div>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}
