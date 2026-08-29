"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { formatDistance } from "@/features/conjunctions/formatters";
import type { ConjunctionRiskLevel } from "@/features/conjunctions/types";

export interface TimelineEvent {
  id: string;
  objectAName: string;
  objectBName: string;
  risk: ConjunctionRiskLevel;
  tcaHours: number;
  tcaLabel: string;
  minimumSeparationKm: number;
  riskScore: number;
}

const tones: Record<ConjunctionRiskLevel, { badge: string; bar: string }> = {
  CRITICAL: { badge: "border-[var(--critical-border)] bg-[var(--critical-fill)] text-critical", bar: "bg-critical" },
  HIGH: { badge: "border-[var(--high-border)] bg-[var(--high-fill)] text-high", bar: "bg-high" },
  MEDIUM: { badge: "border-[var(--medium-border)] bg-[var(--medium-fill)] text-medium", bar: "bg-medium" },
  LOW: { badge: "border-[var(--low-border)] bg-[var(--low-fill)] text-low", bar: "bg-low" },
};

const pageSize = 10;

export function ConjunctionTimeline({ events }: { events: TimelineEvent[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(events.length / pageSize));
  const visiblePage = Math.min(currentPage, totalPages);
  const visibleEvents = useMemo(
    () => events.slice((visiblePage - 1) * pageSize, visiblePage * pageSize),
    [events, visiblePage],
  );

  return (
    <Panel
      title="Upcoming conjunction timeline"
      meta="next 7 days · bar width scales with risk score"
    >
      {events.length === 0 ? (
        <EmptyState title="No upcoming conjunctions" description="No screened conjunction events are currently on record." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-[1100px]">
            <div className="grid h-[38px] grid-cols-[210px_230px_92px_minmax(540px,1fr)] items-center border-b border-[var(--bd)] bg-[rgba(228,222,208,.016)] text-[10px] font-medium text-text-tertiary">
              <div className="border-r border-[var(--bd2)] px-3.5">Object A</div>
              <div className="border-r border-[var(--bd2)] px-3.5">Object B</div>
              <div className="border-r border-[var(--bd2)] px-3.5">Risk</div>
              <div className="grid grid-cols-7 px-3.5 text-center">
                {["+1d", "+2d", "+3d", "+4d", "+5d", "+6d", "+7d"].map((label) => (
                  <span key={label} className="numeric">{label}</span>
                ))}
              </div>
            </div>
            {visibleEvents.map((event) => {
              const tone = tones[event.risk];
              const position = Math.min(100, Math.max(0, (event.tcaHours / (7 * 24)) * 100));
              const barWidth = 18 + event.riskScore * 4;
              const riskLabel = event.risk === "CRITICAL" ? "CRIT" : event.risk === "MEDIUM" ? "MED" : event.risk;
              const calloutAnchor = position < 10 ? "translate-x-0 text-left" : position > 90 ? "-translate-x-full text-right" : "-translate-x-1/2 text-center";
              const barAnchor = position < 3 ? "translate-x-0" : position > 97 ? "-translate-x-full" : "-translate-x-1/2";
              return (
                <div
                  key={event.id}
                  className="grid min-h-[45px] grid-cols-[210px_230px_92px_minmax(540px,1fr)] items-center border-b border-[var(--bd2)] transition-colors duration-120 last:border-b-0 hover:bg-surface-3"
                >
                  <div className="truncate px-3.5 text-[11px] font-medium text-text-primary">{event.objectAName}</div>
                  <div className="truncate px-3.5 text-[11px] text-text-secondary">{event.objectBName}</div>
                  <div className="px-2">
                    <span className={`numeric inline-flex w-full items-center justify-center border py-1 text-[8.5px] font-semibold tracking-[0.06em] ${tone.badge}`}>
                      {riskLabel}
                    </span>
                  </div>
                  <div className="relative h-[44px]">
                    <div className="absolute inset-x-3.5 top-0 h-full">
                      <div className="absolute top-[27px] right-0 left-0 h-px bg-[var(--bd2)]" />
                      <div
                        className={`timeline-callout absolute top-1 whitespace-nowrap text-[10.5px] text-text-secondary ${calloutAnchor}`}
                        style={{ left: `${position}%` }}
                      >
                        {event.tcaLabel} · {formatDistance(event.minimumSeparationKm)}
                      </div>
                      <div
                        className={`absolute top-[25px] h-[4px] ${barAnchor} ${tone.bar}`}
                        style={{ left: `${position}%`, width: `${barWidth}px` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
          {events.length > pageSize ? (
            <Pagination
              currentPage={visiblePage}
              totalPages={totalPages}
              pageSize={pageSize}
              itemLabel="events"
              onPageChange={setCurrentPage}
            />
          ) : null}
        </>
      )}
    </Panel>
  );
}
