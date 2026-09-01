import Link from "next/link";
import { formatLocalClock } from "@/lib/format-date-time";
import type { LiveSatelliteState } from "../types";

function StateField({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="border-r border-b border-[var(--bd2)] px-3.5 py-2.5">
      <div className="text-[10px] font-medium text-text-tertiary">{label}</div>
      <div className="numeric mt-1.5 text-[11.5px] font-medium text-text-primary">
        {value} {unit ? <span className="text-[8.5px] font-normal text-text-tertiary">{unit}</span> : null}
      </div>
    </div>
  );
}

export function LiveStatePanel({
  satellite,
  inFinder,
  onToggleFinder,
}: {
  satellite: LiveSatelliteState;
  inFinder: boolean;
  onToggleFinder: () => void;
}) {
  const velocity = Math.hypot(
    satellite.eci.velocityXKmS,
    satellite.eci.velocityYKmS,
    satellite.eci.velocityZKmS,
  );

  return (
    <aside className="panel-rise border border-[var(--bd)] bg-surface-1">
      <header className="border-b border-[var(--bd)] bg-surface-2 px-4 py-3.5">
        <h2 className="text-[13px] font-semibold text-text-primary">{satellite.name}</h2>
        <p className="numeric mt-1 text-[9px] text-text-tertiary">
          NORAD {satellite.noradCatId} · {satellite.objectType} · {satellite.owner}
        </p>
      </header>

      <div className="flex items-center justify-between border-b border-[var(--bd)] px-3.5 py-2.5">
        <span className="text-[10.5px] font-medium text-text-secondary">State vector · ECI J2000</span>
        <span className="numeric text-[8.5px] text-text-tertiary">{formatLocalClock(satellite.observationTimeUtc, true)}</span>
      </div>
      <div className="grid grid-cols-2 border-l border-[var(--bd2)]">
        <StateField label="ECI X" value={satellite.eci.xKm.toFixed(1)} unit="km" />
        <StateField label="ECI Y" value={satellite.eci.yKm.toFixed(1)} unit="km" />
        <StateField label="ECI Z" value={satellite.eci.zKm.toFixed(1)} unit="km" />
        <StateField label="V X" value={satellite.eci.velocityXKmS.toFixed(3)} unit="km/s" />
        <StateField label="V Y" value={satellite.eci.velocityYKmS.toFixed(3)} unit="km/s" />
        <StateField label="V Z" value={satellite.eci.velocityZKmS.toFixed(3)} unit="km/s" />
      </div>

      <div className="border-y border-[var(--bd)] bg-surface-2 px-3.5 py-2.5 text-[10.5px] font-medium text-text-secondary">
        Current geodetic state
      </div>
      <div className="grid grid-cols-2 border-l border-[var(--bd2)]">
        <StateField label="Latitude" value={`${satellite.latitudeDegrees.toFixed(3)}°`} />
        <StateField label="Longitude" value={`${satellite.longitudeDegrees.toFixed(3)}°`} />
        <StateField label="Altitude" value={satellite.altitudeKm.toFixed(1)} unit="km" />
        <StateField label="Speed" value={velocity.toFixed(3)} unit="km/s" />
        <StateField label="Revolution" value={String(satellite.revolution)} />
        <StateField label="Observation" value={formatLocalClock(satellite.observationTimeUtc, true)} />
      </div>

      <div className="grid grid-cols-2 gap-1.5 p-3.5">
        <button
          onClick={onToggleFinder}
          className="h-9 border border-[var(--bd)] text-[10.5px] font-medium text-text-secondary transition-colors hover:border-[var(--acc-border)] hover:text-text-primary"
        >
          {inFinder ? "Remove from conjunction check" : "Add to conjunction check"}
        </button>
        <Link
          href="/conjunctions"
          className="flex h-9 items-center justify-center border border-[var(--acc-border)] text-[10.5px] font-medium text-[var(--acc-text)] hover:border-[var(--acc)] hover:text-[var(--acc-hover)]"
        >
          Conjunctions
        </Link>
      </div>
    </aside>
  );
}
