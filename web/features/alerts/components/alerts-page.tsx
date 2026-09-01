"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import type { OperationsAlertRecord, OperationsAlertSource } from "../api";
import { useAlerts } from "../hooks/use-alerts";
import { useAcknowledgeAlert } from "../hooks/use-alert-actions";
import type { AlertCounts, AlertFilter, AlertSource, OperationsAlert } from "../types";
import { AlertFilters } from "./alert-filters";
import { AlertList } from "./alert-list";
import { AlertQueue } from "./alert-queue";

const sourceLabels: Record<OperationsAlertSource, AlertSource> = {
  CONJUNCTION_SCREENING: "Conjunction screening",
  ORBIT_DATA: "Orbit data",
  PROPAGATION: "Propagation",
  CATALOG_SYNC: "Catalogue sync",
  SYSTEM: "System",
};

function toOperationsAlert(record: OperationsAlertRecord): OperationsAlert {
  return {
    id: record.id,
    severity: record.severity,
    source: sourceLabels[record.source],
    occurredAt: record.created_at,
    title: record.title,
    description: record.description,
    acknowledged: record.acknowledged,
    resolved: record.resolved,
    ...(record.conjunction_event_id ? { conjunctionEventId: record.conjunction_event_id } : {}),
  };
}

const emptyCounts: AlertCounts = {
  all: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  resolved: 0,
  unacknowledged: 0,
};

const pageSize = 10;

export function AlertsPage() {
  const alertsQuery = useAlerts();
  const acknowledgeAlert = useAcknowledgeAlert();
  const [filter, setFilter] = useState<AlertFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const alerts = useMemo(
    () => (alertsQuery.data?.alerts ?? []).map(toOperationsAlert),
    [alertsQuery.data],
  );
  const counts = alertsQuery.data?.counts ?? emptyCounts;
  const filteredAlerts = useMemo(() => {
    if (filter === "ALL") return alerts;
    if (filter === "RESOLVED") return alerts.filter((alert) => alert.resolved);
    return alerts.filter((alert) => alert.severity === filter);
  }, [alerts, filter]);
  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / pageSize));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedAlerts = filteredAlerts.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);

  function updateFilter(nextFilter: AlertFilter) {
    setFilter(nextFilter);
    setCurrentPage(1);
  }

  return (
    <AppShell
      title="Alerts"
      subtitle="Alert centre · next 30 days · one alert per object pair · ≤ 500 km"
      activePath="/alerts"
      unacknowledgedAlerts={counts.unacknowledged}
    >
      <main className="grid items-start gap-3.5 p-4 min-[1240px]:grid-cols-[minmax(0,1fr)_280px] min-[1240px]:p-5">
        <section className="panel-rise min-w-0 border border-[var(--bd)] bg-surface-1">
          <p className="border-b border-[var(--bd2)] bg-surface-2 px-3.5 py-2.5 text-[10.5px] leading-relaxed text-text-tertiary">
            One alert per object pair (≤ 500 km). Alerts stay open until acknowledged or resolved, so this count can be higher than the <span className="text-text-secondary">Conjunctions</span> page, which lists only approaches whose closest point is still upcoming (next 7 days).
          </p>
          <AlertFilters filter={filter} counts={counts} onChange={updateFilter} />
          {alertsQuery.isPending ? (
            <div className="space-y-2 p-3.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : alertsQuery.isError ? (
            <EmptyState
              tone="error"
              title="Unable to load alerts"
              description="The alerts service could not be reached. Check that the backend is running."
            />
          ) : filteredAlerts.length === 0 ? (
            <EmptyState
              title="No alerts to show"
              description={filter === "ALL" ? "No operational alerts have been raised." : "No alerts match the selected filter."}
            />
          ) : (
            <>
              <AlertList alerts={paginatedAlerts} onAcknowledge={(alertId) => acknowledgeAlert.mutate(alertId)} />
              <Pagination currentPage={visiblePage} totalPages={totalPages} pageSize={pageSize} itemLabel="alerts" onPageChange={setCurrentPage} />
            </>
          )}
        </section>
        <AlertQueue counts={counts} />
      </main>
    </AppShell>
  );
}
