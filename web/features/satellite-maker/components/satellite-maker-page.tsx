"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiError } from "@/lib/api/client";
import { defaultSatelliteDraft } from "../data";
import {
  deriveOrbit,
  toFeaturedGlobeObject,
  validateSatelliteDraft,
} from "../orbit-calculations";
import type { SatelliteMakerRequest } from "../api";
import {
  useCommissionedSatellites,
  useSatelliteCommission,
  useSatelliteDeletion,
  useSatellitePreview,
} from "../hooks/use-satellite-maker";
import { useCurrentSatelliteStates } from "@/features/live-tracking/hooks/use-current-satellite-states";
import { useOrbitAuth } from "@/providers/auth-provider";
import { useSatelliteDrafts } from "../hooks/use-satellite-drafts";
import type { SatelliteDraftConfig } from "../types";
import { MakerStatus } from "./maker-status";
import { OrbitMetrics } from "./orbit-metrics";
import { OrbitPreview } from "./orbit-preview";
import { SatelliteConfigurationForm } from "./satellite-configuration-form";
import { SatelliteDrafts } from "./satellite-drafts";

function toMakerRequest(config: SatelliteDraftConfig, comparisonNoradIds: number[]): SatelliteMakerRequest {
  return {
    object_name: config.objectName,
    operator: config.operator,
    country: config.country,
    object_type: config.objectType === "ROCKET BODY" ? "ROCKET_BODY" : config.objectType,
    epoch_utc: new Date(config.epochUtc).toISOString(),
    altitude_km: config.altitudeKm,
    inclination_degrees: config.inclinationDegrees,
    raan_degrees: config.raanDegrees,
    argument_of_perigee_degrees: config.argumentOfPerigeeDegrees,
    phase_degrees: config.phaseDegrees,
    apsis_offset_km: config.apsisOffsetKm,
    bstar: config.bStar,
    temporary_norad_id: 90000,
    comparison_norad_ids: comparisonNoradIds,
  };
}

export function SatelliteMakerPage() {
  const [config, setConfig] = useState<SatelliteDraftConfig>({ ...defaultSatelliteDraft });
  const { drafts, saveDraft: persistDraft, removeDraft } = useSatelliteDrafts();
  const orbit = useMemo(() => deriveOrbit(config), [config]);
  const validationErrors = useMemo(() => validateSatelliteDraft(config), [config]);
  const featuredObject = useMemo(() => toFeaturedGlobeObject(config, orbit), [config, orbit]);
  const preview = useSatellitePreview();
  const commission = useSatelliteCommission();
  const deletion = useSatelliteDeletion();
  const auth = useOrbitAuth();
  const commissionedSatellites = useCommissionedSatellites();
  const currentStates = useCurrentSatelliteStates(100);
  const comparisonNoradIds = useMemo(
    () => (currentStates.data ?? []).slice(0, 10).map((satellite) => satellite.noradCatId),
    [currentStates.data],
  );
  const displayedOrbit = useMemo(() => {
    if (!preview.data) return orbit;
    return {
      ...orbit,
      semiMajorAxisKm: preview.data.orbit.semi_major_axis_km,
      apogeeKm: preview.data.orbit.apogee_km,
      perigeeKm: preview.data.orbit.perigee_km,
      eccentricity: preview.data.orbit.eccentricity,
      orbitalPeriodMinutes: preview.data.orbit.orbital_period_minutes,
      revolutionsPerDay: preview.data.orbit.revolutions_per_day,
    };
  }, [orbit, preview.data]);

  function updateConfig(changes: Partial<SatelliteDraftConfig>) {
    preview.reset();
    commission.reset();
    setConfig((current) => {
      const next = { ...current, ...changes };
      const maximumOffset = Math.max(0, Math.min(300, next.altitudeKm - 160));
      if (next.apsisOffsetKm > maximumOffset) next.apsisOffsetKm = maximumOffset;
      return next;
    });
  }

  function resetConfig() {
    preview.reset();
    commission.reset();
    setConfig({ ...defaultSatelliteDraft });
  }

  function saveDraft() {
    if (validationErrors.length) return;
    persistDraft(config, orbit);
  }

  function runPreview() {
    if (validationErrors.length) return;
    preview.mutate(toMakerRequest(config, comparisonNoradIds));
  }

  function commissionObject() {
    if (validationErrors.length || !preview.isSuccess) return;
    if (!auth.isSignedIn) {
      auth.openSignIn();
      return;
    }
    commission.mutate(toMakerRequest(config, comparisonNoradIds));
  }

  const previewMessage = preview.isSuccess
    ? `Orbit propagated · perigee ${preview.data.orbit.perigee_km.toFixed(0)} km · ${preview.data.conjunctions.length} conjunction check${preview.data.conjunctions.length === 1 ? "" : "s"}`
    : preview.isError
      ? preview.error instanceof ApiError
        ? preview.error.message
        : "The backend preview request failed."
      : "";
  const commissionMessage = commission.isSuccess
    ? `${commission.data.name} was added to the catalogue as NORAD ${commission.data.norad_cat_id}.`
    : commission.isError
      ? commission.error instanceof ApiError ? commission.error.message : "The backend commission request failed."
      : "";

  if (!auth.isSignedIn) {
    return (
      <AppShell
        title="Satellite Maker"
        subtitle="Define an object · preview its orbit before backend screening"
        activePath="/satellite-maker"
      >
        <main className="p-4 min-[1240px]:p-5">
          {auth.isLoaded ? (
            <EmptyState
              title="Sign in to use the Satellite Maker"
              description="Building and commissioning satellites is available to signed-in operators. Sign in to design an object and preview its orbit."
              action={
                <button
                  onClick={auth.openSignIn}
                  className="h-8 border border-[var(--acc-border)] bg-[var(--acc-tint)] px-4 text-[11px] font-medium text-[var(--acc-text)] transition-colors hover:border-[var(--acc)] hover:text-[var(--acc-hover)]"
                >
                  Sign in
                </button>
              }
            />
          ) : (
            <EmptyState title="Checking access…" />
          )}
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Satellite Maker"
      subtitle="Define an object · preview its orbit before backend screening"
      activePath="/satellite-maker"
    >
      <main className="space-y-3.5 p-4 min-[1240px]:p-5">
        <div className="grid items-start gap-3.5 min-[1240px]:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0">
            <SatelliteConfigurationForm
              config={config}
              onChange={updateConfig}
              onReset={resetConfig}
            />
            <OrbitMetrics orbit={displayedOrbit} />
          </div>
          <div className="min-[1240px]:sticky min-[1240px]:top-[70px]">
            <MakerStatus
              errors={validationErrors}
              onSaveDraft={saveDraft}
              onPreview={runPreview}
              onCommission={commissionObject}
              isAuthenticated={auth.isSignedIn}
              previewStatus={preview.isPending ? "pending" : preview.isSuccess ? "success" : preview.isError ? "error" : "idle"}
              previewMessage={previewMessage}
              commissionStatus={commission.isPending ? "pending" : commission.isSuccess ? "success" : commission.isError ? "error" : "idle"}
              commissionMessage={commissionMessage}
            />
          </div>
        </div>
        <OrbitPreview object={commission.isSuccess ? undefined : featuredObject} />
        <SatelliteDrafts
          drafts={drafts}
          commissionedSatellites={auth.isSignedIn ? commissionedSatellites.data ?? [] : []}
          isLoadingCommissioned={commissionedSatellites.isLoading}
          onRemove={removeDraft}
          onDeleteCommissioned={(noradCatId) => deletion.mutateAsync(noradCatId).then(() => undefined)}
        />
      </main>
    </AppShell>
  );
}
