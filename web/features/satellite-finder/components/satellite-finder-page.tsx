"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { ApiError } from "@/lib/api/client";
import { OrbitalGlobe } from "@/features/globe/components/orbital-globe";
import { toGlobeObject } from "@/features/live-tracking/api";
import { defaultCatalogFilters } from "@/features/orbital-objects/data";
import { useSatelliteCatalog } from "@/features/orbital-objects/hooks/use-satellite-catalog";
import { useNearbySatellites, useSatelliteFinderComparison } from "../hooks/use-satellite-finder";
import { NearbySatelliteTable } from "./nearby-satellite-table";
import { ReferenceSelector } from "./reference-selector";

const pageSize = 10;
const suggestionLimit = 100;

export function SatelliteFinderPage() {
  const [referenceQuery, setReferenceQuery] = useState("");
  const deferredReferenceQuery = useDeferredValue(referenceQuery);
  const [selectedNoradId, setSelectedNoradId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const value = Number(new URLSearchParams(window.location.search).get("norad"));
    return Number.isInteger(value) && value > 0 ? value : null;
  });
  const [currentPage, setCurrentPage] = useState(1);

  const referenceCatalog = useSatelliteCatalog({
    page: 1,
    pageSize: suggestionLimit,
    filters: { ...defaultCatalogFilters, search: deferredReferenceQuery },
    sort: "name",
  });
  const nearby = useNearbySatellites(selectedNoradId, currentPage, pageSize);
  const screening = useSatelliteFinderComparison();
  const result = nearby.data?.primary_satellite.norad_cat_id === selectedNoradId ? nearby.data : null;
  const storedScreenings = screening.data?.comparisons.filter((comparison) => comparison.stored).length ?? 0;

  const globeObjects = useMemo(() => {
    if (!result) return [];
    return [
      { ...toGlobeObject(result.primary_satellite), objectClass: "focused" as const },
      ...result.satellites.map(toGlobeObject),
    ];
  }, [result]);

  const visibleObjectIds = useMemo(() => globeObjects.map((object) => object.id), [globeObjects]);
  const errorMessage = nearby.isError
    ? nearby.error instanceof ApiError
      ? nearby.error.message
      : "The nearby-satellite database scan failed."
    : null;

  return (
    <AppShell title="Conjunction Checking" subtitle="Database proximity scan · current state · 1,000 km radius" activePath="/satellite-finder">
      <main className="space-y-3.5 p-4 min-[1240px]:p-5">
        <div className="grid items-start gap-3.5 min-[1240px]:grid-cols-[minmax(0,1fr)_360px]">
          <Panel
            title="Nearby objects · isolated view"
            meta={<span className="numeric">{result ? `${result.page.total_items} matches` : "Select a reference"}</span>}
          >
            <OrbitalGlobe
              finder
              objects={globeObjects}
              visibleObjectIds={visibleObjectIds}
              selectedObjectId={selectedNoradId ?? undefined}
            />
          </Panel>
          <ReferenceSelector
            query={referenceQuery}
            onQueryChange={setReferenceQuery}
            options={deferredReferenceQuery === referenceQuery && !referenceCatalog.isPlaceholderData ? referenceCatalog.data?.objects ?? [] : []}
            totalMatches={referenceCatalog.isPlaceholderData ? 0 : referenceCatalog.data?.page.total_items ?? 0}
            loading={referenceCatalog.isPending || referenceCatalog.isFetching || deferredReferenceQuery !== referenceQuery}
            error={referenceCatalog.isError}
            selectedId={selectedNoradId}
            primary={result?.primary_satellite ?? null}
            onSelect={(object) => {
              screening.reset();
              setSelectedNoradId(object.noradCatId);
              setReferenceQuery(object.name);
              setCurrentPage(1);
              window.history.replaceState(null, "", `/satellite-finder?norad=${object.noradCatId}`);
            }}
          />
        </div>
        {errorMessage ? (
          <section className="border border-[var(--critical-border)] bg-[var(--critical-fill)] px-4 py-3 text-[11px] font-medium text-critical">
            {errorMessage} The selected satellite may not have a stored propagated state yet.
          </section>
        ) : null}
        {result ? (
          <section className="flex flex-col gap-3 border border-[var(--bd)] bg-surface-1 px-4 py-3 min-[760px]:flex-row min-[760px]:items-center min-[760px]:justify-between">
            <div>
              <h2 className="text-[12px] font-semibold text-text-primary">Python TCA screening</h2>
              <p className="mt-1 text-[10px] text-text-tertiary">
                Propagate and persist the {result.satellites.length} nearby objects shown on this page.
              </p>
              {screening.isSuccess ? (
                <div className="mt-1.5 space-y-1 text-[10px]">
                  <p className={storedScreenings > 0 ? "text-nominal" : "text-text-secondary"}>
                    {screening.data.completed} calculated · {storedScreenings} stored
                    {screening.data.failed > 0 ? ` · ${screening.data.failed} failed` : ""}.
                  </p>
                  {storedScreenings === 0 ? (
                    <p className="text-text-tertiary">
                      Nothing qualified for storage: Python must return a TCA inside 7 days and a minimum separation of 500 km or less.
                    </p>
                  ) : (
                    <p className="text-text-tertiary">
                      Stored results refreshed Alerts; results with TCA within ±24 hours also appear in Conjunctions.
                    </p>
                  )}
                </div>
              ) : screening.isError ? (
                <p className="mt-1.5 text-[10px] text-critical">
                  Screening failed. No successful result was hidden by the UI cache.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={screening.isPending || result.satellites.length === 0}
              onClick={() => screening.mutate({
                primary_norad_id: result.primary_satellite.norad_cat_id,
                comparison_norad_ids: result.satellites.map((satellite) => satellite.norad_cat_id),
                duration_minutes: 1_440,
                step_seconds: 60,
                include_separation_profile: true,
              })}
              className="h-9 shrink-0 border border-[var(--acc-border)] bg-[var(--acc-tint)] px-4 text-[10.5px] font-medium text-[var(--acc-text)] transition-colors hover:bg-[rgba(143,175,196,.18)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {screening.isPending ? "Running TCA screening…" : `Screen this page (${result.satellites.length})`}
            </button>
          </section>
        ) : null}
        <NearbySatelliteTable
          result={result}
          loading={selectedNoradId !== null && (nearby.isPending || nearby.isFetching)}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </main>
    </AppShell>
  );
}
