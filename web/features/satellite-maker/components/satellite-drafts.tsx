import type { SavedMakerSatellite } from "../api";
import type { SatelliteDraft } from "../types";

export function SatelliteDrafts({
  drafts,
  commissionedSatellites,
  isLoadingCommissioned,
  onRemove,
}: {
  drafts: SatelliteDraft[];
  commissionedSatellites: SavedMakerSatellite[];
  isLoadingCommissioned: boolean;
  onRemove: (draftId: number) => void;
}) {
  const commissionedNames = new Set(commissionedSatellites.map((satellite) => satellite.name.toLowerCase()));
  const localDrafts = drafts.filter((draft) => !commissionedNames.has(draft.config.objectName.toLowerCase()));
  const objectCount = commissionedSatellites.length + localDrafts.length;

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
                <span className="text-center text-[9.5px] text-nominal">Stored</span>
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
