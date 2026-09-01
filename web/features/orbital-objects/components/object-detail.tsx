"use client";

import Link from "next/link";
import { formatLocalDateTime } from "@/lib/format-date-time";
import { useConjunctionScreen } from "@/features/conjunctions/hooks/use-conjunction-screen";
import type { CatalogObjectType, OrbitalObject } from "../types";
import { CatalogRiskBadge } from "./catalog-risk-badge";

const typeLabels: Record<CatalogObjectType, string> = {
  PAYLOAD: "Payload",
  "ROCKET BODY": "Rocket body",
  DEBRIS: "Debris",
  UNKNOWN: "Unknown",
};

function measurement(value: number | null, digits: number, unit: string): string {
  return value === null ? "—" : `${value.toFixed(digits)} ${unit}`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[63px] border-r border-b border-[var(--bd2)] px-3.5 py-3 even:border-r-0">
      <div className="text-[10px] font-medium text-text-tertiary">{label}</div>
      <div className="numeric mt-2 text-[12.5px] font-medium text-text-primary">{value}</div>
    </div>
  );
}

export function ObjectDetail({ object, wishlisted, onToggleWishlist }: { object: OrbitalObject; wishlisted: boolean; onToggleWishlist: () => void }) {
  const conjunctionScreen = useConjunctionScreen();

  return (
    <aside className="panel-rise border border-[var(--bd)] bg-surface-1">
      <header className="border-b border-[var(--bd)] bg-surface-2 px-3.5 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.012em]">{object.name}</h2>
            <div className="numeric mt-1.5 text-[9px] text-text-tertiary">NORAD {object.noradCatId}</div>
          </div>
          <span className="text-[16px] leading-none text-text-tertiary">×</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="numeric border border-[var(--acc-border)] bg-[var(--acc-tint)] px-2 py-1 text-[8.5px] font-semibold tracking-[0.07em] text-accent">{object.objectType === "ROCKET BODY" ? "R/B" : object.objectType}</span>
          <span className="numeric border border-[var(--bd)] px-2 py-1 text-[8.5px] font-semibold tracking-[0.07em] text-text-secondary">{object.status}</span>
          {object.risk ? <CatalogRiskBadge level={object.risk} /> : null}
        </div>
      </header>

      <div className="grid grid-cols-2">
        <Field label="NORAD ID" value={String(object.noradCatId)} />
        <Field label="Object type" value={typeLabels[object.objectType]} />
        <Field label="Country / owner" value={object.owner} />
        <Field label="Status" value={object.status} />
        <Field label="Launch date" value={object.launchDate} />
        <Field label="Altitude" value={measurement(object.altitudeKm, 1, "km")} />
        <Field label="Apogee" value={measurement(object.apogeeKm, 1, "km")} />
        <Field label="Perigee" value={measurement(object.perigeeKm, 1, "km")} />
        <Field label="Inclination" value={measurement(object.inclinationDegrees, 2, "°")} />
        <Field label="RAAN" value={measurement(object.raanDegrees, 1, "°")} />
        <Field label="Velocity" value={measurement(object.velocityKmS, 3, "km/s")} />
        <Field label="Orbital period" value={measurement(object.orbitalPeriodMinutes, 1, "min")} />
        <Field label="TLE epoch" value={object.tleEpoch === null ? "Unavailable" : formatLocalDateTime(object.tleEpoch)} />
        <Field label="Last updated" value={object.lastUpdatedMinutes === null ? "Unavailable" : `${object.lastUpdatedMinutes} min ago`} />
      </div>

      <div className="grid grid-cols-2 gap-2 p-3.5">
        <Link
          href={`/live-tracking?norad=${object.noradCatId}`}
          className="col-span-2 flex h-9 items-center justify-center border border-[var(--acc-border)] bg-[var(--acc-tint)] text-[11.5px] font-medium text-[var(--acc-text)] transition-colors duration-150 hover:bg-[rgba(143,175,196,.18)]"
        >
          Track object
        </Link>
        <Link
          href={`/satellite-finder?norad=${object.noradCatId}`}
          className="flex h-9 items-center justify-center border border-[var(--bd)] text-[11.5px] text-text-secondary transition-colors duration-150 hover:border-[var(--acc-border)] hover:text-text-primary"
        >
          Open conjunction check
        </Link>
        <button onClick={onToggleWishlist} className={`h-9 border text-[11.5px] font-medium transition-colors duration-150 ${wishlisted ? "border-[var(--nominal-border)] bg-[var(--nominal-fill)] text-nominal" : "border-[var(--bd)] text-text-secondary hover:border-[var(--acc-border)] hover:text-text-primary"}`}>
          {wishlisted ? "In wishlist" : "Add to wishlist"}
        </button>
        <button
          disabled={conjunctionScreen.isPending}
          onClick={() => conjunctionScreen.mutate({ primary_norad_id: object.noradCatId, candidate_limit: 15 })}
          className="col-span-2 h-9 border border-[var(--bd)] text-[11.5px] text-text-secondary transition-colors duration-150 hover:border-[var(--acc-border)] hover:text-text-primary disabled:cursor-wait disabled:opacity-50"
        >
          {conjunctionScreen.isPending ? "Screening 15 candidates…" : "Check conjunctions"}
        </button>
        {conjunctionScreen.isSuccess ? (
          <p className="col-span-2 text-[10px] text-nominal">{conjunctionScreen.data.completed} of {conjunctionScreen.data.requested} candidates screened successfully.</p>
        ) : conjunctionScreen.isError ? (
          <p className="col-span-2 text-[10px] text-critical">The conjunction screening request failed.</p>
        ) : null}
      </div>
    </aside>
  );
}
