"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { ApiError } from "@/lib/api/client";
import { OrbitalGlobe } from "@/features/globe/components/orbital-globe";
import { useCurrentSatelliteStates } from "@/features/live-tracking/hooks/use-current-satellite-states";
import { useCommissionedSatellites } from "@/features/satellite-maker/hooks/use-satellite-maker";
import type { SatelliteMakerObjectType } from "@/features/satellite-maker/api";
import { useSatelliteFinderComparison } from "../hooks/use-satellite-finder";
import { ComparisonSet } from "./comparison-set";
import { PairwiseTable } from "./pairwise-table";
import type { FinderObject, FinderObjectClass, PairwiseInteraction } from "../types";

const makerClassByType: Record<SatelliteMakerObjectType, FinderObjectClass> = {
  PAYLOAD: "active",
  ROCKET_BODY: "rocket",
  DEBRIS: "debris",
};

function readNumber(result: Record<string, unknown>, key: string): number | null {
  const value = result[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(result: Record<string, unknown>, key: string): string | null {
  const value = result[key];
  return typeof value === "string" ? value : null;
}

export function SatelliteFinderPage() {
  const [comparisonIds, setComparisonIds] = useState<number[]>([]);
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const initialized = useRef(false);
  const currentStates = useCurrentSatelliteStates(100);
  const commissioned = useCommissionedSatellites();
  const userCreatedIds = useMemo(
    () => new Set((commissioned.data ?? []).map((satellite) => satellite.norad_cat_id)),
    [commissioned.data],
  );
  const finderObjects = useMemo<FinderObject[]>(() => {
    const catalog = (currentStates.data ?? []).map((state) => ({
      noradCatId: state.noradCatId,
      name: state.name,
      objectClass: state.globeObject.objectClass === "focused" ? "active" : state.globeObject.objectClass,
      altitudeKm: state.altitudeKm,
      inclinationDegrees: state.inclinationDegrees,
      velocityKmS: state.speedKmS,
      orbitalPeriodMinutes: state.orbitalPeriodMinutes,
      positionEciKm: { x: state.eci.xKm, y: state.eci.yKm, z: state.eci.zKm },
      velocityEciKmS: { x: state.eci.velocityXKmS, y: state.eci.velocityYKmS, z: state.eci.velocityZKmS },
      isUserCreated: userCreatedIds.has(state.noradCatId),
    }));

    const catalogIds = new Set(catalog.map((object) => object.noradCatId));
    const extraUserCreated = (commissioned.data ?? [])
      .filter((satellite) => !catalogIds.has(satellite.norad_cat_id))
      .map<FinderObject>((satellite) => ({
        noradCatId: satellite.norad_cat_id,
        name: satellite.name,
        objectClass: makerClassByType[satellite.object_type],
        altitudeKm: satellite.altitude_km ?? 0,
        inclinationDegrees: satellite.inclination_degrees ?? 0,
        velocityKmS: satellite.velocity_km_s ?? 0,
        orbitalPeriodMinutes: satellite.orbital_period_minutes ?? 0,
        positionEciKm: { x: 0, y: 0, z: 0 },
        velocityEciKmS: { x: 0, y: 0, z: 0 },
        isUserCreated: true,
      }));

    return [...extraUserCreated, ...catalog];
  }, [currentStates.data, commissioned.data, userCreatedIds]);
  const globeObjects = useMemo(() => (currentStates.data ?? []).map((state) => state.globeObject), [currentStates.data]);

  useEffect(() => {
    if (initialized.current || finderObjects.length < 2) return;
    initialized.current = true;
    const requestedId = typeof window === "undefined" ? 0 : Number(new URLSearchParams(window.location.search).get("norad"));
    const preferred = finderObjects.find((object) => object.noradCatId === requestedId);
    const initial = preferred ? [preferred, ...finderObjects.filter((object) => object.noradCatId !== requestedId)] : finderObjects;
    setComparisonIds(initial.slice(0, 3).map((object) => object.noradCatId));
  }, [finderObjects]);
  const comparisonObjects = useMemo(() => comparisonIds.flatMap((id) => {
    const object = finderObjects.find(({ noradCatId }) => noradCatId === id);
    return object ? [object] : [];
  }), [comparisonIds, finderObjects]);
  const effectivePrimaryId = primaryId !== null && comparisonIds.includes(primaryId) ? primaryId : comparisonIds[0] ?? null;
  const primaryObject = comparisonObjects.find((object) => object.noradCatId === effectivePrimaryId) ?? null;
  const screening = useSatelliteFinderComparison();
  const interactions = useMemo<PairwiseInteraction[]>(() => {
    if (!screening.data || !comparisonObjects.length) return [];
    const primary = comparisonObjects.find((object) => object.noradCatId === screening.data.primary_satellite.norad_cat_id);
    if (!primary) return [];
    return screening.data.comparisons.flatMap(({ satellite, result }) => {
      const counterpart = comparisonObjects.find((object) => object.noradCatId === satellite.norad_cat_id);
      if (!counterpart) return [];
      const currentSeparationKm = readNumber(result, "current_separation_km");
      const minimumSeparationKm = readNumber(result, "minimum_separation_km");
      const relativeVelocityKmS = readNumber(result, "relative_velocity_km_s");
      const tca = readString(result, "closest_approach_time_utc");
      const computedAt = readString(result, "calculated_at") ?? readString(result, "prediction_time_utc");
      if (currentSeparationKm === null || minimumSeparationKm === null || relativeVelocityKmS === null) return [];
      const minutesToMinimum = tca && computedAt ? Math.max(0, Math.round((new Date(tca).getTime() - new Date(computedAt).getTime()) / 60_000)) : 0;
      return [{
        objectA: primary,
        objectB: counterpart,
        currentSeparationKm,
        minimumSeparationKm,
        minutesToMinimum,
        relativeVelocityKmS,
        altitudeDifferenceKm: Math.abs(primary.altitudeKm - counterpart.altitudeKm),
        inclinationDifferenceDegrees: Math.abs(primary.inclinationDegrees - counterpart.inclinationDegrees),
        verdict: "SCREENED",
      }];
    });
  }, [comparisonObjects, screening.data]);

  function addObject(objectId: number) {
    setComparisonIds((current) => current.length >= 10 || current.includes(objectId) ? current : [...current, objectId]);
  }

  function runScreening() {
    if (comparisonIds.length < 2 || effectivePrimaryId === null) return;
    const comparison = comparisonIds.filter((id) => id !== effectivePrimaryId);
    if (!comparison.length) return;
    screening.mutate({ primary_norad_id: effectivePrimaryId, comparison_norad_ids: comparison });
  }

  const screeningTone = screening.isSuccess
    ? "border-[var(--nominal-border)] bg-[var(--nominal-fill)] text-nominal"
    : screening.isError
      ? "border-[var(--critical-border)] bg-[var(--critical-fill)] text-critical"
      : "border-[var(--bd)] bg-surface-2 text-text-secondary";
  const referenceName = primaryObject?.name ?? "the reference satellite";
  const screeningMessage = screening.isPending
    ? `Screening the comparison set against ${referenceName}…`
    : screening.isSuccess
      ? `Screened ${screening.data.requested} pair${screening.data.requested === 1 ? "" : "s"} against ${referenceName} · ${screening.data.completed} completed · ${screening.data.failed} failed`
      : screening.isError
        ? screening.error instanceof ApiError ? screening.error.message : "The backend screening request failed."
        : primaryObject
          ? `Every object is compared with respect to ${referenceName}. Run backend screening to check them.`
          : "Add objects and choose a reference satellite to compare against.";

  return (
    <AppShell title="Satellite Finder" subtitle="Targeted pair analysis · relative geometry" activePath="/satellite-finder">
      <main className="space-y-3.5 p-4 min-[1240px]:p-5">
        <div className="grid items-start gap-3.5 min-[1240px]:grid-cols-[minmax(0,1fr)_360px]">
          <Panel
            title="Focused objects · isolated view"
            meta={<span className="numeric">{comparisonObjects.length} in comparison set</span>}
          >
            <OrbitalGlobe finder objects={globeObjects} visibleObjectIds={comparisonIds} />
          </Panel>
          <ComparisonSet
            catalog={finderObjects}
            objects={comparisonObjects}
            primaryId={effectivePrimaryId}
            onAdd={addObject}
            onSetPrimary={setPrimaryId}
            onRemove={(objectId) => setComparisonIds((current) => current.filter((id) => id !== objectId))}
            onClear={() => { setComparisonIds([]); setPrimaryId(null); }}
          />
        </div>
        <section className={`flex flex-wrap items-center justify-between gap-3 border px-4 py-3 ${screeningTone}`}>
          <p className="text-[11px] font-medium">{screeningMessage}</p>
          <button
            onClick={runScreening}
            disabled={comparisonIds.length < 2 || screening.isPending}
            className="h-8 shrink-0 border border-[var(--acc-border)] bg-[var(--acc-tint)] px-4 text-[11px] font-medium text-[var(--acc-text)] transition-colors hover:border-[var(--acc)] hover:text-[var(--acc-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {screening.isPending ? "Screening…" : "Run backend screening"}
          </button>
        </section>
        <PairwiseTable interactions={interactions} />
      </main>
    </AppShell>
  );
}
