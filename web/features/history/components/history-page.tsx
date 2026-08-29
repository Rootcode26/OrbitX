"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLocalDateTime } from "@/lib/format-date-time";
import { useWishlist } from "@/features/wishlist/use-wishlist";
import { useCurrentSatelliteStates } from "@/features/live-tracking/hooks/use-current-satellite-states";
import type { SatelliteHistoryRecord } from "../api";
import { useSatelliteHistory } from "../hooks/use-satellite-history";
import type { ElementSetRecord } from "../types";
import { AltitudeHistoryChart } from "./altitude-history-chart";
import { ElementHistoryTable } from "./element-history-table";
import { HistorySelector } from "./history-selector";

function formatEpoch(iso: string): string {
  const formatted = formatLocalDateTime(iso);
  return formatted === "—" ? iso : formatted;
}

function toElementSetRecord(record: SatelliteHistoryRecord, index: number): ElementSetRecord {
  return {
    sequence: index + 1,
    epochUtc: formatEpoch(record.calculated_at),
    tleEpoch: formatEpoch(record.tle_epoch),
    altitudeKm: record.height_km,
    apogeeKm: record.apogee_km,
    perigeeKm: record.perigee_km,
    altitudeDeltaKm: record.altitude_delta_km,
    inclinationDegrees: record.inclination_degrees,
    raanDegrees: record.raan_degrees,
    meanMotionRevolutionsPerDay: record.mean_motion_revolutions_per_day,
    bstar: record.bstar,
    source: "Propagation snapshot",
    altitudeIncrease: (record.altitude_delta_km ?? 0) > 0,
  };
}

function EmptyWishlist({ isAuthenticated, onSignIn }: { isAuthenticated: boolean; onSignIn: () => void }) {
  return (
    <AppShell title="History" subtitle="Stored propagation snapshots · orbital change" activePath="/history">
      <main className="p-4 min-[1240px]:p-5">
        <section className="panel-rise flex min-h-[360px] flex-col items-center justify-center border border-[var(--bd)] bg-surface-1 px-6 text-center">
          <p className="text-[13px] font-semibold text-text-primary">{isAuthenticated ? "Your history wishlist is empty" : "Sign in to view your history"}</p>
          <p className="mt-2 max-w-md text-[11px] leading-relaxed text-text-secondary">{isAuthenticated ? "Open Orbital Objects, select a satellite, and add it to your wishlist. Only wishlisted objects will appear on this page." : "Your wishlist and selected satellites are stored securely against your account."}</p>
          {isAuthenticated ? (
            <Link href="/orbital-objects" className="mt-5 border border-[var(--acc-border)] bg-[var(--acc-tint)] px-4 py-2.5 text-[11px] font-medium text-[var(--acc-text)] transition-colors duration-140 hover:bg-[rgba(143,175,196,.18)]">Browse orbital objects</Link>
          ) : (
            <button onClick={onSignIn} className="mt-5 border border-[var(--acc-border)] bg-[var(--acc-tint)] px-4 py-2.5 text-[11px] font-medium text-[var(--acc-text)] transition-colors duration-140 hover:bg-[rgba(143,175,196,.18)]">Sign in</button>
          )}
        </section>
      </main>
    </AppShell>
  );
}

export function HistoryPage() {
  const wishlist = useWishlist();
  const ids = wishlist.objectIds.slice(0, 10);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const effectiveId = selectedId !== null && ids.includes(selectedId) ? selectedId : ids[0] ?? null;
  const history = useSatelliteHistory(effectiveId, { limit: 100 });
  const currentStates = useCurrentSatelliteStates(100);

  if (ids.length === 0) return <EmptyWishlist isAuthenticated={wishlist.isAuthenticated} onSignIn={wishlist.requestSignIn} />;

  const records = (history.data?.records ?? []).map(toElementSetRecord);

  const items = ids.map((id) => ({
    noradCatId: id,
    name: currentStates.data?.find((state) => state.noradCatId === id)?.name
      ?? (id === effectiveId && history.data ? history.data.satellite.name : `NORAD ${id}`),
  }));

  const newestEpoch = history.data?.records[0]?.calculated_at;
  const oldestEpoch = history.data?.records.at(-1)?.calculated_at;
  const spanHours = newestEpoch && oldestEpoch ? (new Date(newestEpoch).getTime() - new Date(oldestEpoch).getTime()) / 3_600_000 : 0;
  const durationDays = Math.round(spanHours / 24);
  const cadenceHours = records.length > 1 ? Math.max(1, Math.round(spanHours / (records.length - 1))) : 0;

  return (
    <AppShell title="History" subtitle="Stored propagation snapshots · orbital change" activePath="/history">
      <main className="space-y-3.5 p-4 min-[1240px]:p-5">
        <HistorySelector
          histories={items}
          selectedId={effectiveId ?? ids[0]}
          onSelect={setSelectedId}
          onRemove={(id) => wishlist.toggle(id)}
        />
        <section key={effectiveId ?? "none"} className="panel-rise border border-[var(--bd)] bg-surface-1">
          <header className="flex min-h-10 items-center justify-between gap-4 border-b border-[var(--bd)] bg-surface-2 px-3.5 py-[11px]">
            <div className="flex items-center gap-3">
              <h2 className="text-[12.5px] font-semibold text-text-primary">{history.data?.satellite.name ?? `NORAD ${effectiveId}`} · propagation history</h2>
              <span className="text-[9.5px] text-text-tertiary">NORAD {effectiveId}</span>
            </div>
            {records.length > 0 ? (
              <span className="numeric text-[10px] text-text-tertiary">{durationDays} days · {records.length} snapshots · ~{cadenceHours} h cadence</span>
            ) : null}
          </header>
          {history.isPending ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-[200px] w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : history.isError ? (
            <EmptyState
              tone="error"
              title="Unable to load propagation history"
              description="The satellite history service could not be reached, or no data is stored for this object."
            />
          ) : records.length === 0 ? (
            <EmptyState
              title="No stored propagation snapshots"
              description="No historical state snapshots have been recorded for this satellite yet."
            />
          ) : (
            <>
              <AltitudeHistoryChart records={records} cadenceHours={cadenceHours} />
              <ElementHistoryTable records={records} />
            </>
          )}
        </section>
        <p className="text-[9.5px] leading-relaxed text-text-tertiary">
          Altitude, apsides and trend values are stored from propagation results derived from the attached TLE. Positive changes describe consecutive samples only; they do not confirm a manoeuvre or reboost.
        </p>
      </main>
    </AppShell>
  );
}
