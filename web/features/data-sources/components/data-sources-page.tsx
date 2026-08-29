"use client";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataSources } from "../hooks/use-data-sources";
import type { DataSourceStatus, OperationsDataSource } from "../types";
import { DataSourceCard } from "./data-source-card";

const descriptions: Record<DataSourceStatus["id"], string> = {
  tle: "GP element sets · active satellites and priority debris",
  satcat: "Satellite catalogue · four synchronized object groups",
  propagation: "ECI position and velocity predictions",
  current_state: "Current orbital and geodetic satellite state",
  conjunction: "Pairwise close-approach calculations",
};

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1_000));
  if (elapsedSeconds < 60) return "just now";

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays} d ago`;
}

function formatLocalClockTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date).toUpperCase();
}

function formatDailyUtcSchedule(hour: string, minute: string): string {
  const schedule = new Date();
  schedule.setUTCHours(Number(hour), Number(minute), 0, 0);
  return `daily ${formatLocalClockTime(schedule)}`;
}

// Turns a cron expression (e.g. "0 */2 * * *") into a human cadence ("2 h").
function describeCadence(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length === 5) {
    const [minute, hour] = parts;
    const everyHours = hour.match(/^\*\/(\d+)$/);
    if (everyHours && /^\d+$/.test(minute)) return `${everyHours[1]} h`;
    const everyMinutes = minute.match(/^\*\/(\d+)$/);
    if (everyMinutes && hour === "*") return `${everyMinutes[1]} min`;
    if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
      return formatDailyUtcSchedule(hour, minute);
    }
  }
  return cron;
}

function toCardSource(status: DataSourceStatus): OperationsDataSource {
  const cadence = describeCadence(status.cadence);
  return {
    id: status.id,
    name: status.name,
    description: descriptions[status.id],
    endpoint: status.endpoint,
    state: status.status,
    records: status.records,
    lastSync: status.last_sync_utc
      ? formatRelativeTime(status.last_sync_utc)
      : "—",
    nextSync: status.cadence === "on demand" ? "on request" : `~${cadence}`,
    cadence,
    detail: status.error ?? (status.status === "empty" ? "no records ingested yet" : "records available"),
  };
}

function DataSourceCardSkeleton() {
  return (
    <article className="border border-[var(--bd)] bg-surface-1">
      <header className="border-b border-[var(--bd)] bg-surface-2 px-4 py-3.5">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-2.5 w-52" />
        </div>
      </header>
      <div className="grid grid-cols-3 gap-4 px-4 py-3">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
    </article>
  );
}

export function DataSourcesPage() {
  const dataSources = useDataSources();

  return (
    <AppShell
      title="Data Sources"
      subtitle="External ingest and orbital computation services"
      activePath="/data-sources"
    >
      <main className="grid items-start gap-3.5 p-4 min-[1240px]:grid-cols-2 min-[1240px]:p-5">
        {dataSources.isPending ? (
          <>
            <DataSourceCardSkeleton />
            <DataSourceCardSkeleton />
          </>
        ) : dataSources.isError ? (
          <EmptyState
            className="min-[1240px]:col-span-2"
            tone="error"
            title="Unable to load data sources"
            description="The ingest status service could not be reached. Check that the backend is running."
          />
        ) : dataSources.data && dataSources.data.length > 0 ? (
          dataSources.data.map((status) => (
            <DataSourceCard key={status.id} source={toCardSource(status)} />
          ))
        ) : (
          <EmptyState
            className="min-[1240px]:col-span-2"
            title="No data sources reported"
            description="The backend has not registered any external data or computation services yet."
          />
        )}
      </main>
    </AppShell>
  );
}
