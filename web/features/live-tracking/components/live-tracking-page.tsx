"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { OrbitalGlobe } from "@/features/globe/components/orbital-globe";
import { selectGlobeObjectsByQuota } from "@/features/globe/select-globe-objects";
import { useSatelliteState } from "../hooks/use-satellite-state";
import { useCurrentSatelliteStates } from "../hooks/use-current-satellite-states";
import { LiveStatePanel } from "./live-state-panel";

export function LiveTrackingPage() {
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const value = Number(new URLSearchParams(window.location.search).get("norad"));
    return Number.isInteger(value) && value > 0 ? value : null;
  });
  const [finderIds, setFinderIds] = useState<Set<number>>(new Set());
  const currentStates = useCurrentSatelliteStates(100);
  const objects = useMemo(
    () => selectGlobeObjectsByQuota(
      (currentStates.data ?? []).map((satellite) => satellite.globeObject),
      undefined,
      selectedObjectId !== null ? [selectedObjectId] : undefined,
    ),
    [currentStates.data, selectedObjectId],
  );
  const effectiveObjectId = selectedObjectId ?? objects[0]?.id ?? null;
  const state = useSatelliteState(effectiveObjectId);

  function toggleFinder() {
    if (effectiveObjectId === null) return;
    setFinderIds((current) => {
      const next = new Set(current);
      if (next.has(effectiveObjectId)) next.delete(effectiveObjectId);
      else next.add(effectiveObjectId);
      return next;
    });
  }

  return (
    <AppShell
      title="Live Tracking"
      subtitle="Real-time propagation · inertial and ground frame"
      activePath="/live-tracking"
    >
      <main className="grid items-start gap-3.5 p-4 min-[1240px]:grid-cols-[minmax(0,1fr)_340px] min-[1240px]:p-5 min-[1500px]:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title="Live propagation"
          meta={<span className="numeric">click a satellite marker to inspect its current state</span>}
        >
          <OrbitalGlobe
            tracking
            objects={objects}
            selectedObjectId={effectiveObjectId ?? undefined}
            onObjectSelect={setSelectedObjectId}
          />
        </Panel>
        <div className="min-[1240px]:sticky min-[1240px]:top-[70px]">
          {currentStates.isPending || state.isPending ? (
            <aside className="panel-rise space-y-3 border border-[var(--bd)] bg-surface-1 p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-2.5 w-52" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </aside>
          ) : state.isError || !state.data ? (
            <EmptyState
              tone="error"
              title="No live state available"
              description={effectiveObjectId === null ? "No propagated satellite states are currently available." : `No current propagated state was returned for NORAD ${effectiveObjectId}.`}
            />
          ) : (
            <LiveStatePanel
              satellite={state.data}
              inFinder={effectiveObjectId !== null && finderIds.has(effectiveObjectId)}
              onToggleFinder={toggleFinder}
            />
          )}
        </div>
      </main>
    </AppShell>
  );
}
