"use client";

import { useEffect, useState } from "react";
import type { SavedMakerSatellite } from "../api";
import type { SatelliteDraft } from "../types";

export function SatelliteDrafts({
  drafts,
  commissionedSatellites,
  isLoadingCommissioned,
  onRemove,
  onDeleteCommissioned,
}: {
  drafts: SatelliteDraft[];
  commissionedSatellites: SavedMakerSatellite[];
  isLoadingCommissioned: boolean;
  onRemove: (draftId: number) => void;
  onDeleteCommissioned: (noradCatId: number) => Promise<void>;
}) {
  const [deleteTarget, setDeleteTarget] = useState<SavedMakerSatellite | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const commissionedNames = new Set(commissionedSatellites.map((satellite) => satellite.name.toLowerCase()));
  const localDrafts = drafts.filter((draft) => !commissionedNames.has(draft.config.objectName.toLowerCase()));
  const objectCount = commissionedSatellites.length + localDrafts.length;

  useEffect(() => {
    if (!deleteTarget) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeleting) {
        setDeleteError(null);
        setDeleteTarget(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deleteTarget, isDeleting]);

  async function confirmDeletion() {
    if (!deleteTarget || isDeleting) return;
    setDeleteError(null);
    setIsDeleting(true);

    try {
      await onDeleteCommissioned(deleteTarget.norad_cat_id);
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "The satellite could not be deleted.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="panel-rise border border-[var(--bd)] bg-surface-1">
      <header className="flex items-center justify-between border-b border-[var(--bd)] bg-surface-2 px-3.5 py-[11px]">
        <h2 className="text-[12.5px] font-semibold tracking-[-0.006em]">Created satellites and local drafts</h2>
        <span className="numeric text-[9.5px] text-text-tertiary">browser + commissioned · {objectCount} objects</span>
      </header>
      {objectCount ? (
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            {commissionedSatellites.map((satellite) => (
              <div key={`commissioned-${satellite.norad_cat_id}`} className="grid grid-cols-[minmax(220px,1fr)_90px_90px_100px_100px_100px] items-center border-b border-[var(--bd2)] px-3.5 py-3 last:border-b-0">
                <div>
                  <div className="text-[11.5px] font-medium text-text-primary">{satellite.name}</div>
                  <div className="numeric mt-1 text-[9px] text-nominal">NORAD {satellite.norad_cat_id} · COMMISSIONED</div>
                </div>
                <DraftMetric label="Alt km" value={formatMetric(satellite.altitude_km, 0)} />
                <DraftMetric label="Incl" value={formatMetric(satellite.inclination_degrees, 1)} />
                <DraftMetric label="Velocity" value={formatMetric(satellite.velocity_km_s, 3)} />
                <DraftMetric label="Period" value={formatMetric(satellite.orbital_period_minutes, 1)} />
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget(satellite);
                  }}
                  className="h-8 border border-[var(--critical-border)] bg-[color-mix(in_srgb,var(--critical)_5%,transparent)] text-[10px] text-critical transition-colors hover:bg-[color-mix(in_srgb,var(--critical)_11%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            ))}
            {localDrafts.map((draft) => (
              <div key={draft.id} className="grid grid-cols-[minmax(220px,1fr)_90px_90px_100px_100px_100px] items-center border-b border-[var(--bd2)] px-3.5 py-3 last:border-b-0">
                <div>
                  <div className="text-[11.5px] font-medium text-text-primary">{draft.config.objectName}</div>
                  <div className="numeric mt-1 text-[9px] text-text-tertiary">DRAFT {draft.id} · {draft.config.objectType}</div>
                </div>
                <DraftMetric label="Alt km" value={draft.config.altitudeKm.toFixed(0)} />
                <DraftMetric label="Incl" value={draft.config.inclinationDegrees.toFixed(1)} />
                <DraftMetric label="Velocity" value={draft.orbit.currentVelocityKmS.toFixed(3)} />
                <DraftMetric label="Period" value={draft.orbit.orbitalPeriodMinutes.toFixed(1)} />
                <button onClick={() => onRemove(draft.id)} className="h-8 border border-[var(--bd)] text-[10px] text-text-secondary hover:border-[var(--critical-border)] hover:text-critical">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-[10.5px] text-text-tertiary">
          {isLoadingCommissioned ? "Loading created satellites…" : "No created satellites or local drafts yet."}
        </div>
      )}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="delete-satellite-title" aria-describedby="delete-satellite-description">
          <div className="w-full max-w-[440px] border border-[var(--critical-border)] bg-surface-1 shadow-2xl">
            <header className="border-b border-[var(--bd)] bg-surface-2 px-4 py-3.5">
              <div className="numeric text-[9px] font-semibold tracking-[0.12em] text-critical">PERMANENT DATABASE DELETION</div>
              <h3 id="delete-satellite-title" className="mt-1.5 text-[14px] font-semibold text-text-primary">Delete {deleteTarget.name}?</h3>
            </header>
            <div className="px-4 py-4">
              <p id="delete-satellite-description" className="text-[11px] leading-5 text-text-secondary">
                This permanently deletes NORAD {deleteTarget.norad_cat_id} from the database, including its stored orbit data and associated conjunction, alert, and wishlist records. This action cannot be undone.
              </p>
              {deleteError ? (
                <div className="mt-3 border border-[var(--critical-border)] bg-[color-mix(in_srgb,var(--critical)_6%,transparent)] px-3 py-2 text-[10.5px] text-critical" role="alert">
                  {deleteError}
                </div>
              ) : null}
            </div>
            <footer className="flex justify-end gap-2 border-t border-[var(--bd)] px-4 py-3">
              <button
                type="button"
                autoFocus
                disabled={isDeleting}
                onClick={() => {
                  setDeleteError(null);
                  setDeleteTarget(null);
                }}
                className="h-8 border border-[var(--bd)] px-4 text-[10.5px] text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeletion}
                className="h-8 min-w-[116px] border border-[var(--critical-border)] bg-[var(--critical)] px-4 text-[10.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {isDeleting ? "Deleting…" : "Delete permanently"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function formatMetric(value: number | null, fractionDigits: number) {
  return value === null ? "—" : value.toFixed(fractionDigits);
}

function DraftMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] text-text-tertiary">{label}</div>
      <div className="numeric mt-1 text-[10.5px] text-text-primary">{value}</div>
    </div>
  );
}
