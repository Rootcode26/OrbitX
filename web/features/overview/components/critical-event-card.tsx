"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useConjunctionEvents } from "@/features/conjunctions/hooks/use-conjunction-events";
import type { ConjunctionEventRecord } from "@/features/conjunctions/types";
import { useAlerts } from "@/features/alerts/hooks/use-alerts";
import { useAcknowledgeAlert } from "@/features/alerts/hooks/use-alert-actions";
import { formatLocalDateTime } from "@/lib/format-date-time";

const riskRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, CLEAR: 0 };

function formatCountdown(target: string | null, now: number) {
  if (!target) return "—";
  const remaining = Math.max(0, new Date(target).getTime() - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function formatSeparation(km: number | null) {
  if (km === null) return "—";
  return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(2)} km`;
}

function formatTcaLabel(target: string | null) {
  if (!target) return "TCA unavailable";
  const formatted = formatLocalDateTime(target);
  return formatted === "—" ? "TCA unavailable" : `TCA ${formatted}`;
}

export function CriticalEventCard() {
  const events = useConjunctionEvents({ limit: 10, upcoming: true });
  const alerts = useAlerts({ limit: 100 });
  const acknowledge = useAcknowledgeAlert();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (events.isPending) {
    return (
      <section className="panel-rise space-y-3 border border-[var(--bd)] bg-surface-1 p-3.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-8 w-full" />
      </section>
    );
  }

  const topEvent: ConjunctionEventRecord | undefined = (events.data?.events ?? [])
    .filter((event) => event.risk_level === "CRITICAL" || event.risk_level === "HIGH")
    .sort((a, b) => (riskRank[b.risk_level] ?? 0) - (riskRank[a.risk_level] ?? 0)
      || (a.tca ? new Date(a.tca).getTime() : Infinity) - (b.tca ? new Date(b.tca).getTime() : Infinity))[0];

  if (!topEvent) {
    return (
      <EmptyState
        title="No critical conjunctions"
        description="No high or critical risk conjunctions are currently forecast."
      />
    );
  }

  const riskScore = Math.min(10, Math.max(0, (topEvent.risk_score ?? 0) / 10));
  const isCritical = topEvent.risk_level === "CRITICAL";
  const relatedAlert = alerts.data?.alerts.find((alert) => alert.conjunction_event_id === topEvent.id);
  const acknowledged = relatedAlert?.acknowledged ?? false;

  return (
    <section className="panel-rise border border-[var(--critical-border)] border-t-2 border-t-critical bg-[rgba(196,68,62,.055)] p-3.5">
      <div className="flex items-center justify-between">
        <span className="numeric flex items-center gap-2 text-[9px] font-semibold tracking-[0.16em] text-critical">
          <span className="h-1.5 w-1.5 bg-critical" />
          {isCritical ? "CRITICAL RISK" : "HIGH RISK"}
        </span>
        <span className="numeric text-[9px] text-text-tertiary">{topEvent.id.slice(0, 8)}</span>
      </div>

      <div className="mt-3 border-b border-[rgba(196,68,62,.2)] pb-3">
        <div className="flex items-center justify-between">
          <strong className="text-[13px] font-semibold">{topEvent.object_a.name}</strong>
          <span className="numeric text-[9px] text-text-tertiary">NORAD {topEvent.object_a.norad_cat_id}</span>
        </div>
        <div className="my-2 flex items-center gap-2 text-[9px] text-critical">
          <span className="text-base leading-none">↓</span>
          <span className="numeric tracking-[0.12em]">CONJUNCTION</span>
        </div>
        <div className="flex items-center justify-between">
          <strong className="text-[13px] font-semibold">{topEvent.object_b.name}</strong>
          <span className="numeric text-[9px] text-text-tertiary">NORAD {topEvent.object_b.norad_cat_id}</span>
        </div>
      </div>

      <div className="border-b border-[var(--bd)] py-3">
        <div className="text-[10px] font-medium text-text-tertiary">Time to closest approach</div>
        <div className="numeric mt-3 text-[32px] leading-none font-medium text-[#e2aaa5]">
          {formatCountdown(topEvent.tca, now)}
        </div>
        <div className="numeric mt-2 text-[10px] text-text-tertiary">{formatTcaLabel(topEvent.tca)}</div>
      </div>

      <div className="grid grid-cols-2 border-b border-[var(--bd)]">
        <div className="border-r border-[var(--bd2)] px-3 py-3">
          <div className="text-[10px] text-text-tertiary">Min separation</div>
          <div className="numeric mt-2 text-[13px] font-medium text-critical">{formatSeparation(topEvent.minimum_separation_km)}</div>
        </div>
        <div className="px-3 py-3">
          <div className="text-[10px] text-text-tertiary">Relative velocity</div>
          <div className="numeric mt-2 text-[13px] font-medium">{topEvent.relative_velocity_km_s?.toFixed(1) ?? "—"} km/s</div>
        </div>
      </div>

      <div className="py-3">
        <div className="flex justify-between text-[10px] text-text-tertiary">
          <span>Risk score</span>
          <span className="numeric text-[#d78982]">{riskScore.toFixed(1)} / 10</span>
        </div>
        <div className="mt-2 h-[3px] bg-[rgba(228,222,208,.08)]">
          <div className="h-full bg-critical" style={{ width: `${Math.min(100, Math.max(0, riskScore * 10))}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_116px] gap-2">
        <Link href="/conjunctions" className="flex h-8 items-center justify-center border border-[var(--critical-border)] bg-[var(--critical-fill)] text-[11.5px] font-medium text-[#e5b2ae] transition-colors duration-150 hover:bg-[rgba(196,68,62,.22)]">
          Open analysis
        </Link>
        <button
          onClick={() => relatedAlert && acknowledge.mutate(relatedAlert.id)}
          disabled={!relatedAlert || acknowledged || acknowledge.isPending}
          className="h-8 border border-[var(--bd)] text-[11.5px] text-text-secondary transition-colors duration-150 hover:border-[var(--acc-border)] hover:text-text-primary"
        >
          {acknowledged ? "Acknowledged" : "Acknowledge"}
        </button>
      </div>
    </section>
  );
}
