"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useWishlist } from "@/features/wishlist/use-wishlist";
import { useConjunctionEvents } from "@/features/conjunctions/hooks/use-conjunction-events";
import { defaultCatalogFilters } from "../data";
import { useSatelliteCatalog, useSatelliteCatalogOptions } from "../hooks/use-satellite-catalog";
import type { CatalogFilters, CatalogRiskLevel, CatalogSortKey } from "../types";

const riskRank: Record<CatalogRiskLevel, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
import { ObjectCatalog } from "./object-catalog";
import { ObjectDetail } from "./object-detail";
import { ObjectFilters } from "./object-filters";

const pageSize = 10;

function ObjectCatalogSkeleton() {
  return (
    <section aria-label="Loading object catalog" aria-busy="true" className="border border-[var(--bd)] bg-surface-1">
      <header className="flex min-h-10 items-center justify-between border-b border-[var(--bd)] bg-surface-2 px-3.5 py-[11px]">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-2.5 w-24" />
      </header>
      <div className="grid grid-cols-[1.2fr_1.5fr_.7fr_.6fr_.6fr_.6fr_.6fr_.6fr] gap-4 border-b border-[var(--bd2)] px-3.5 py-3">
        {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-2.5 w-full" />)}
      </div>
      <div>
        {Array.from({ length: pageSize }).map((_, row) => (
          <div key={row} className="grid min-h-[40px] grid-cols-[1.2fr_1.5fr_.7fr_.6fr_.6fr_.6fr_.6fr_.6fr] items-center gap-4 border-b border-[var(--bd2)] px-3.5">
            {Array.from({ length: 8 }).map((_, column) => (
              <Skeleton key={column} className={`h-2.5 ${column === 1 ? "w-4/5" : "w-full"}`} />
            ))}
          </div>
        ))}
      </div>
      <footer className="flex items-center justify-between border-t border-[var(--bd)] px-3.5 py-2.5">
        <Skeleton className="h-2.5 w-24" />
        <div className="flex gap-1">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-12" />
        </div>
      </footer>
    </section>
  );
}

function ObjectDetailSkeleton() {
  return (
    <aside aria-label="Loading object details" aria-busy="true" className="border border-[var(--bd)] bg-surface-1">
      <header className="space-y-3 border-b border-[var(--bd)] bg-surface-2 px-3.5 py-3.5">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-2.5 w-20" />
        <div className="flex gap-1.5">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </header>
      <div className="grid grid-cols-2">
        {Array.from({ length: 14 }).map((_, index) => (
          <div key={index} className="min-h-[63px] space-y-2.5 border-r border-b border-[var(--bd2)] px-3.5 py-3 even:border-r-0">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-3 w-28 max-w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 p-3.5">
        <Skeleton className="col-span-2 h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="col-span-2 h-9 w-full" />
      </div>
    </aside>
  );
}

export function OrbitalObjectsPage() {
  const [filters, setFilters] = useState<CatalogFilters>({ ...defaultCatalogFilters });
  const [sortKey, setSortKey] = useState<CatalogSortKey>("name");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const wishlist = useWishlist();
  const catalog = useSatelliteCatalog({ page: currentPage, pageSize, filters, sort: sortKey });
  const options = useSatelliteCatalogOptions();
  const conjunctions = useConjunctionEvents({ limit: 100 });

  const riskByNorad = useMemo(() => {
    const map = new Map<number, CatalogRiskLevel>();
    for (const event of conjunctions.data?.events ?? []) {
      if (event.risk_level === "CLEAR") continue;
      const level = event.risk_level;
      for (const noradCatId of [event.object_a.norad_cat_id, event.object_b.norad_cat_id]) {
        const existing = map.get(noradCatId);
        if (!existing || riskRank[level] > riskRank[existing]) map.set(noradCatId, level);
      }
    }
    return map;
  }, [conjunctions.data]);

  const pageObjects = useMemo(
    () => (catalog.data?.objects ?? []).map((object) => ({
      ...object,
      risk: riskByNorad.get(object.noradCatId) ?? null,
    })),
    [catalog.data, riskByNorad],
  );
  const effectiveSelectedId = pageObjects.some((object) => object.id === selectedObjectId)
    ? selectedObjectId
    : pageObjects[0]?.id ?? "";
  const selectedObject = pageObjects.find((object) => object.id === effectiveSelectedId) ?? pageObjects[0];

  function updateFilters(changes: Partial<CatalogFilters>) {
    setFilters((current) => ({ ...current, ...changes }));
    setCurrentPage(1);
  }

  function resetFilters() {
    setFilters({ ...defaultCatalogFilters });
    setSortKey("name");
    setCurrentPage(1);
  }

  function updateSort(nextSortKey: CatalogSortKey) {
    setSortKey(nextSortKey);
    setCurrentPage(1);
  }

  return (
    <AppShell
      title="Orbital Objects"
      subtitle="Catalog · searchable object registry"
      activePath="/orbital-objects"
    >
      <main className="grid items-start gap-3.5 p-4 min-[1240px]:grid-cols-[minmax(0,1fr)_380px] min-[1240px]:p-5 min-[1500px]:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-3.5">
          <ObjectFilters
            filters={filters}
            sortKey={sortKey}
            owners={options.data?.owners ?? []}
            onFiltersChange={updateFilters}
            onSortChange={updateSort}
            onReset={resetFilters}
          />
          {catalog.isPending ? <ObjectCatalogSkeleton /> : (
            <ObjectCatalog
              objects={pageObjects}
              selectedObjectId={effectiveSelectedId}
              currentPage={currentPage}
              totalPages={catalog.data?.page.total_pages ?? 0}
              totalObjects={catalog.data?.page.total_items ?? 0}
              pageSize={pageSize}
              onSelect={setSelectedObjectId}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
        <div className="min-[1240px]:sticky min-[1240px]:top-[70px]">
          {catalog.isPending ? <ObjectDetailSkeleton /> : selectedObject ? <ObjectDetail
            key={selectedObject.id}
            object={selectedObject}
            wishlisted={wishlist.includes(selectedObject.noradCatId)}
            onToggleWishlist={() => wishlist.toggle(selectedObject.noradCatId)}
          /> : <section className="border border-[var(--bd)] bg-surface-1 p-8 text-center text-[11px] text-text-tertiary">{catalog.isError ? "Unable to load the object catalog." : "Loading object catalog…"}</section>}
        </div>
      </main>
    </AppShell>
  );
}
