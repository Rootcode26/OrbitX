"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useConjunctionEvents } from "@/features/conjunctions/hooks/use-conjunction-events";
import type { ConjunctionEventRecord, ConjunctionEventRiskLevel } from "@/features/conjunctions/types";
import type { RiskLevel } from "../types";
import { RiskBadge } from "./risk-badge";

function toRiskLevel(level: ConjunctionEventRiskLevel): RiskLevel {
  return level === "CLEAR" ? "LOW" : level;
}

function formatMissDistance(km: number | null): string {
  if (km === null) return "—";
  return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(2)} km`;
}

function formatTca(tca: string | null, now: number): string {
  if (!tca) return "—";
  const remaining = new Date(tca).getTime() - now;
  if (Number.isNaN(remaining)) return "—";
  if (remaining <= 0) return "now";
  const totalMinutes = Math.floor(remaining / 60_000);
  return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, "0")}m`;
}

function missDistanceTone(level: RiskLevel): string {
  if (level === "CRITICAL") return "text-critical";
  if (level === "HIGH" || level === "MEDIUM") return "text-medium";
  return "text-text-secondary";
}

export function UpcomingConjunctions() {
  const events = useConjunctionEvents({ limit: 10, upcoming: true });
  const [now, setNow] = useState(() => Date.now());
  const rows: ConjunctionEventRecord[] = (events.data?.events ?? []).filter((event) => event.risk_level !== "CLEAR");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Panel
      title="Upcoming conjunctions · next 7 days"
      meta={<span className="numeric text-text-tertiary">{rows.length} events</span>}
    >
      {events.isPending ? (
        <div className="space-y-2 p-3.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
        </div>
      ) : events.isError ? (
        <EmptyState
          tone="error"
          title="Unable to load conjunctions"
          description="The conjunction screening service could not be reached."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No upcoming conjunctions"
          description="No screened conjunction events are currently on record."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead className="bg-[rgba(228,222,208,.016)] text-[10.5px] font-medium text-text-tertiary">
              <tr>
                <th className="px-3.5 py-[9px] font-medium">Object A</th>
                <th className="px-3.5 py-[9px] font-medium">Object B</th>
                <th className="px-3.5 py-[9px] text-center font-medium">Risk</th>
                <th className="px-3.5 py-[9px] text-right font-medium">Miss dist</th>
                <th className="px-3.5 py-[9px] text-right font-medium">Rel vel</th>
                <th className="px-3.5 py-[9px] text-right font-medium">TCA</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((event) => {
                const risk = toRiskLevel(event.risk_level);
                return (
                  <tr key={event.id} className="border-t border-[var(--bd2)] transition-colors duration-120 hover:bg-surface-3">
                    <td className="px-3.5 py-[9px] text-[12.5px] font-medium">{event.object_a.name}</td>
                    <td className="px-3.5 py-[9px] text-[12.5px] text-text-secondary">{event.object_b.name}</td>
                    <td className="px-3.5 py-[7px] text-center"><RiskBadge level={risk} compact /></td>
                    <td className={`numeric px-3.5 py-[9px] text-right ${missDistanceTone(risk)}`}>{formatMissDistance(event.minimum_separation_km)}</td>
                    <td className="numeric px-3.5 py-[9px] text-right text-text-secondary">{event.relative_velocity_km_s?.toFixed(1) ?? "—"}</td>
                    <td className="numeric px-3.5 py-[9px] text-right font-medium">{formatTca(event.tca, now)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
