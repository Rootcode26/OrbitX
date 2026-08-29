import type { ConjunctionObject } from "../types";

function objectTypeLabel(objectType: ConjunctionObject["objectType"]): string {
  if (objectType === "ROCKET BODY") return "Rocket body";
  if (objectType === "DEBRIS") return "Debris";
  if (objectType === "PAYLOAD") return "Payload";
  return "Unknown";
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[50px] border-b border-[var(--bd2)] px-3 py-2.5">
      <div className="text-[10px] font-medium text-text-tertiary">{label}</div>
      <div className="numeric mt-1 text-[11.5px] font-medium text-text-primary">{value}</div>
    </div>
  );
}

export function ConjunctionObjectPanel({
  label,
  object,
  tracked,
  onTrack,
}: {
  label: "Object A" | "Object B";
  object: ConjunctionObject;
  tracked: boolean;
  onTrack: () => void;
}) {
  return (
    <section className="min-w-0 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className={label === "Object A" ? "text-accent" : "text-high"}>{label}</span>
        <button onClick={onTrack} className="text-[10.5px] text-text-tertiary transition-colors hover:text-[var(--acc-hover)]">
          {tracked ? "Tracking" : "Track"}
        </button>
      </div>
      <h3 className="mt-2 truncate text-[13px] font-semibold text-text-primary">{object.name}</h3>
      <p className="numeric mt-1 text-[9.5px] text-text-tertiary">NORAD {object.noradCatId} · {object.owner ?? "Unknown"}</p>
      <div className="mt-3 grid grid-cols-2 border-t border-l border-[var(--bd2)] [&>*]:border-r">
        <Field label="NORAD ID" value={String(object.noradCatId)} />
        <Field label="Object type" value={objectTypeLabel(object.objectType)} />
        <Field label="Status" value={object.status === "UNKNOWN" ? "Unknown" : object.status} />
        <Field label="Country / owner" value={object.owner ?? "Unknown"} />
        <Field label="Launch date" value={object.launchDate ?? "Unknown"} />
        <Field label="Altitude" value={object.altitudeKm === null ? "—" : `${object.altitudeKm.toFixed(1)} km`} />
        <Field label="Apogee" value={object.apogeeKm === null ? "—" : `${object.apogeeKm.toFixed(1)} km`} />
        <Field label="Perigee" value={object.perigeeKm === null ? "—" : `${object.perigeeKm.toFixed(1)} km`} />
        <Field label="Inclination" value={object.inclinationDegrees === null ? "—" : `${object.inclinationDegrees.toFixed(2)}°`} />
        <Field label="RAAN" value={object.raanDegrees === null ? "—" : `${object.raanDegrees.toFixed(1)}°`} />
      </div>
    </section>
  );
}

