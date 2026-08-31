"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLocalClock } from "@/lib/format-date-time";
import { useOverview } from "../hooks/use-overview";
import type { OverviewMetric } from "../types";

const tones = {
  default: "text-text-primary",
  accent: "text-accent",
  critical: "text-critical",
};

function MetricStripSkeleton() {
  return (
    <section className="panel-rise stagger-rise grid grid-cols-2 border border-[var(--bd)] bg-surface-1 min-[1000px]:grid-cols-3 min-[1240px]:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <article key={index} className="min-w-0 space-y-3 border-r border-b border-[var(--bd2)] px-4 py-3.5 last:border-r-0 min-[1240px]:border-b-0">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-2 w-28" />
        </article>
      ))}
    </section>
  );
}

export function MetricStrip() {
  const overview = useOverview();

  if (overview.isPending) return <MetricStripSkeleton />;

  if (overview.isError || !overview.data) {
    return (
      <EmptyState
        tone="error"
        title="Unable to load the operational summary"
        description="The overview metrics service could not be reached. Check that the backend is running."
      />
    );
  }

  const summary = overview.data;
  const metrics: OverviewMetric[] = [
    { label: "Tracked objects", value: summary.tracked_objects.toLocaleString(), detail: "objects in the catalogue" },
    { label: "Active satellites", value: summary.active_payloads.toLocaleString(), detail: "payloads with current elements", tone: "accent" },
    { label: "Debris + fragments", value: (summary.debris + summary.rocket_bodies).toLocaleString(), detail: "catalogued non-payloads" },
    { label: "Conjunctions", value: summary.upcoming_conjunctions.toLocaleString(), unit: "ev", detail: "upcoming screened pairs" },
    { label: "High risk", value: summary.high_risk_conjunctions.toLocaleString(), unit: "ev", detail: "reported high or critical", tone: "critical" },
    { label: "Last synchronised", value: summary.latest_catalog_update ? formatLocalClock(summary.latest_catalog_update) : "—", detail: "CelesTrak catalogue update · local time" },
  ];

  return (
    <section className="panel-rise stagger-rise grid grid-cols-2 border border-[var(--bd)] bg-surface-1 min-[1000px]:grid-cols-3 min-[1240px]:grid-cols-6">
      {metrics.map((metric) => (
        <article key={metric.label} className="min-w-0 border-r border-b border-[var(--bd2)] px-4 py-3.5 last:border-r-0 min-[1240px]:border-b-0">
          <h2 className="text-[10.5px] font-medium text-text-tertiary">{metric.label}</h2>
          <div className={`numeric mt-3 flex items-end gap-1.5 text-[26px] leading-none font-medium ${tones[metric.tone ?? "default"]}`}>
            {metric.value}
            {metric.unit ? <span className="pb-0.5 text-[9px] font-normal text-text-tertiary">{metric.unit}</span> : null}
          </div>
          <p className={`numeric mt-2 truncate text-[9px] ${metric.tone === "critical" ? "text-[#b96d68]" : "text-text-tertiary"}`}>
            {metric.detail}
          </p>
        </article>
      ))}
    </section>
  );
}
