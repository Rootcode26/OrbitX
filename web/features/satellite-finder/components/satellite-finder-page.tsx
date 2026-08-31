"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { ApiError } from "@/lib/api/client";
import { OrbitalGlobe } from "@/features/globe/components/orbital-globe";
import { toGlobeObject } from "@/features/live-tracking/api";
import { defaultCatalogFilters } from "@/features/orbital-objects/data";
import { useSatelliteCatalog } from "@/features/orbital-objects/hooks/use-satellite-catalog";
import { useNearbySatellites } from "../hooks/use-satellite-finder";
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
  const result = nearby.data?.primary_satellite.norad_cat_id === selectedNoradId ? nearby.data : null;

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
    <AppShell title="Satellite Finder" subtitle="Database proximity scan · current state · 1,000 km radius" activePath="/satellite-finder">
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
