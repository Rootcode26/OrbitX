import { Panel } from "@/components/ui/panel";
import { DateTimeField } from "@/components/ui/date-time-field";
import { countryOptions } from "../data";
import type { MakerObjectType, SatelliteDraftConfig } from "../types";
import { OrbitSlider } from "./orbit-slider";

const objectTypes: { label: string; value: MakerObjectType }[] = [
  { label: "Payload", value: "PAYLOAD" },
  { label: "Rocket body", value: "ROCKET BODY" },
  { label: "Debris", value: "DEBRIS" },
];

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block px-3.5 py-3">
      <span className="text-[10px] font-medium text-text-tertiary">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-9 w-full border border-[var(--bd)] bg-field px-3 text-[11.5px] text-text-primary outline-none transition-colors focus:border-[var(--acc-border)]"
      />
    </label>
  );
}

export function SatelliteConfigurationForm({
  config,
  onChange,
  onReset,
}: {
  config: SatelliteDraftConfig;
  onChange: (changes: Partial<SatelliteDraftConfig>) => void;
  onReset: () => void;
}) {
  return (
    <Panel
      title="Orbit definition"
      meta={<button onClick={onReset} className="text-[var(--acc-text)] hover:text-[var(--acc-hover)]">Reset values</button>}
    >
      <div className="grid divide-x divide-y divide-[var(--bd2)] min-[1000px]:grid-cols-2">
        <TextField label="Object name" value={config.objectName} onChange={(objectName) => onChange({ objectName })} />
        <TextField label="Operator" value={config.operator} onChange={(operator) => onChange({ operator })} />
        <label className="block px-3.5 py-3">
          <span className="text-[10px] font-medium text-text-tertiary">Country / owner</span>
          <select
            value={config.country}
            onChange={(event) => onChange({ country: event.target.value })}
            className="numeric mt-2 h-9 w-full border border-[var(--bd)] bg-field px-3 text-[11px] text-text-primary outline-none focus:border-[var(--acc-border)]"
          >
            {countryOptions.map((country) => <option key={country}>{country}</option>)}
          </select>
        </label>
        <div className="px-3.5 py-3">
          <div className="text-[10px] font-medium text-text-tertiary">Object type</div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {objectTypes.map((objectType) => (
              <button
                key={objectType.value}
                onClick={() => onChange({ objectType: objectType.value })}
                className={`h-9 border text-[9px] font-medium transition-colors ${config.objectType === objectType.value ? "border-[var(--acc-border)] bg-[var(--acc-tint)] text-[var(--acc-text)]" : "border-[var(--bd)] text-text-tertiary hover:text-text-primary"}`}
              >
                {objectType.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <OrbitSlider label="Mean altitude" value={config.altitudeKm} minimum={180} maximum={2000} step={1} unit="km" onChange={(altitudeKm) => onChange({ altitudeKm })} />
      <OrbitSlider label="Inclination" value={config.inclinationDegrees} minimum={0} maximum={180} step={0.1} unit="°" onChange={(inclinationDegrees) => onChange({ inclinationDegrees })} />
      <OrbitSlider label="RAAN" value={config.raanDegrees} minimum={0} maximum={360} step={1} unit="°" onChange={(raanDegrees) => onChange({ raanDegrees })} />
      <OrbitSlider label="Argument of perigee" value={config.argumentOfPerigeeDegrees} minimum={0} maximum={360} step={1} unit="°" onChange={(argumentOfPerigeeDegrees) => onChange({ argumentOfPerigeeDegrees })} />
      <OrbitSlider label="Phase at epoch" value={config.phaseDegrees} minimum={0} maximum={360} step={1} unit="°" onChange={(phaseDegrees) => onChange({ phaseDegrees })} />
      <OrbitSlider label="Apsis offset" value={config.apsisOffsetKm} minimum={0} maximum={Math.max(0, Math.min(300, config.altitudeKm - 160))} step={1} unit="km" onChange={(apsisOffsetKm) => onChange({ apsisOffsetKm })} />

      <div className="grid border-t border-[var(--bd2)] min-[1000px]:grid-cols-2 min-[1000px]:divide-x min-[1000px]:divide-[var(--bd2)]">
        <DateTimeField
          label="Epoch (local time)"
          value={config.epochUtc}
          onChange={(epochUtc) => onChange({ epochUtc })}
        />
        <label className="block px-3.5 py-3">
          <span className="text-[10px] font-medium text-text-tertiary">B* drag term · optional</span>
          <input
            type="number"
            step="0.00001"
            value={config.bStar}
            onChange={(event) => onChange({ bStar: Number(event.target.value) })}
            className="numeric mt-2 h-9 w-full border border-[var(--bd)] bg-field px-3 text-[10.5px] text-text-primary outline-none focus:border-[var(--acc-border)]"
          />
        </label>
      </div>
    </Panel>
  );
}
