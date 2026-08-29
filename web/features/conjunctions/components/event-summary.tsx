"use client";

import { useEffect, useState } from "react";
import { ConjunctionRiskBadge } from "./conjunction-risk-badge";
import { ConjunctionObjectPanel } from "./conjunction-object-panel";
import { formatComputedTime } from "../formatters";
import type { ConjunctionEvent } from "../types";

const borderStyles: Record<ConjunctionEvent["risk"], string> = {
  CRITICAL: "border-[var(--critical-border)]",
  HIGH: "border-[var(--high-border)]",
  MEDIUM: "border-[var(--medium-border)]",
  LOW: "border-[var(--low-border)]",
};

function formatTcaCountdown(tcaIso: string | null, now: number): string {
  if (!tcaIso) return "TCA unavailable";
  const target = new Date(tcaIso).getTime();
  if (Number.isNaN(target)) return "TCA unavailable";

  const diff = target - now;
  const past = diff < 0;
  const totalMinutes = Math.floor(Math.abs(diff) / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  const label = days > 0
    ? `${days}d ${hours}h ${String(minutes).padStart(2, "0")}m`
    : `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return past ? `${label} ago` : `in ${label}`;
}

export function EventSummary({
  event,
  trackedIds,
  onToggleTrack,
}: {
  event: ConjunctionEvent;
  trackedIds: Set<number>;
  onToggleTrack: (noradCatId: number) => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section className={`panel-rise border bg-surface-1 ${borderStyles[event.risk]}`}>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--bd)] bg-surface-2 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-4">
          <ConjunctionRiskBadge level={event.risk} full />
          <div className="min-w-0">
            <h2 className="truncate text-[14px] font-semibold tracking-[-0.006em]">
              {event.objectA.name} <span className="text-text-tertiary">↔</span> {event.objectB.name}
            </h2>
            <p className="numeric mt-1 text-[9.5px] text-text-tertiary">
              EVENT {event.id} · COMPUTED {formatComputedTime(event.computedAt)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium text-text-tertiary">TCA</div>
          <div className="numeric mt-1 text-[18px] font-medium">{event.tcaLabel}</div>
          <div className="numeric mt-1 text-[9.5px] text-text-tertiary">{formatTcaCountdown(event.tcaIso, now)}</div>
        </div>
      </header>
      <div className="grid divide-y divide-[var(--bd2)] min-[1000px]:grid-cols-2 min-[1000px]:divide-x min-[1000px]:divide-y-0">
        <ConjunctionObjectPanel
          label="Object A"
          object={event.objectA}
          tracked={trackedIds.has(event.objectA.noradCatId)}
          onTrack={() => onToggleTrack(event.objectA.noradCatId)}
        />
        <ConjunctionObjectPanel
          label="Object B"
          object={event.objectB}
          tracked={trackedIds.has(event.objectB.noradCatId)}
          onTrack={() => onToggleTrack(event.objectB.noradCatId)}
        />
      </div>
    </section>
  );
}
