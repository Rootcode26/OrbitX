import { Panel } from "@/components/ui/panel";
import { formatDistance } from "../formatters";
import { buildEncounterModel } from "../encounter-model";
import type { ConjunctionEvent } from "../types";

const strokeByRisk: Record<ConjunctionEvent["risk"], string> = {
  CRITICAL: "var(--critical)",
  HIGH: "var(--high)",
  MEDIUM: "var(--medium)",
  LOW: "var(--low)",
};

const PLOT_LEFT = 12;
const PLOT_RIGHT = 628;
const PLOT_TOP = 18;
const PLOT_BOTTOM = 145;

export function SeparationProfile({ event }: { event: ConjunctionEvent }) {
  const stroke = strokeByRisk[event.risk];
  const tcaTime = event.tcaIso ? new Date(event.tcaIso).getTime() : NaN;
  const windowMs = 2 * 60 * 60 * 1000;
  const samples = event.separationProfile.filter((sample) => {
    const time = new Date(sample.timestamp).getTime();
    return Number.isFinite(tcaTime) && Math.abs(time - tcaTime) <= windowMs;
  });
  const displayedSamples = samples.length > 1 ? samples : event.separationProfile;
  const times = displayedSamples.map((sample) => new Date(sample.timestamp).getTime());
  const separations = displayedSamples.map((sample) => sample.separationKm);
  const minimum = separations.length ? Math.min(...separations) : 0;
  const maximum = separations.length ? Math.max(...separations) : 1;
  const range = Math.max(maximum - minimum, 0.001);

  const timeMin = times.length ? Math.min(...times) : 0;
  const timeMax = times.length ? Math.max(...times) : 1;
  const timeSpan = Math.max(timeMax - timeMin, 1);

  const xForTime = (time: number) => PLOT_LEFT + ((time - timeMin) / timeSpan) * (PLOT_RIGHT - PLOT_LEFT);
  const yForSeparation = (separationKm: number) => {
    const y = PLOT_BOTTOM - ((separationKm - minimum) / range) * (PLOT_BOTTOM - PLOT_TOP);
    return Math.max(PLOT_TOP - 6, Math.min(PLOT_BOTTOM + 6, y));
  };

  const dataPath = displayedSamples
    .map((sample, index) => `${index === 0 ? "M" : "L"} ${xForTime(times[index]).toFixed(2)} ${yForSeparation(sample.separationKm).toFixed(2)}`)
    .join(" ");

  // Rectilinear model overlay — the physical short-encounter approximation.
  const model = buildEncounterModel(event);
  const modelPath = Number.isFinite(tcaTime)
    ? Array.from({ length: 121 }, (_unused, index) => {
        const time = timeMin + (index / 120) * timeSpan;
        const minutes = (time - tcaTime) / 60000;
        return `${index === 0 ? "M" : "L"} ${xForTime(time).toFixed(2)} ${yForSeparation(model.separationAt(minutes)).toFixed(2)}`;
      }).join(" ")
    : "";

  const minimumIndex = separations.indexOf(minimum);
  const minimumX = xForTime(times[Math.max(minimumIndex, 0)] ?? timeMin);
  const tcaX = Number.isFinite(tcaTime) ? xForTime(tcaTime) : (PLOT_LEFT + PLOT_RIGHT) / 2;

  return (
    <Panel
      title="Separation profile"
      meta={<span className="numeric">TCA ± 2 h · {displayedSamples.length} propagated samples</span>}
    >
      <div className="bg-well px-3 py-2">
        {displayedSamples.length > 1 ? (
          <svg viewBox="0 0 640 190" className="block h-[190px] w-full" role="img" aria-label="Separation over the hours around closest approach">
            <line x1={tcaX} y1={PLOT_TOP} x2={tcaX} y2="158" stroke="var(--bd)" />
            <line x1={PLOT_LEFT} y1={yForSeparation(minimum)} x2={PLOT_RIGHT} y2={yForSeparation(minimum)} stroke="var(--bd2)" strokeDasharray="4 5" />
            {modelPath ? <path d={modelPath} fill="none" stroke="var(--t3)" strokeWidth="1.2" strokeDasharray="3 4" opacity="0.75" /> : null}
            <path d={dataPath} fill="none" stroke={stroke} strokeWidth="2" />
            <circle cx={minimumX} cy={yForSeparation(minimum)} r="4.5" fill={stroke} />
            <text x={PLOT_LEFT} y="182" fill="var(--t3)" fontSize="10" fontFamily="var(--font-inter)">TCA − 2 h</text>
            <text x={PLOT_RIGHT} y="182" fill="var(--t3)" fontSize="10" textAnchor="end" fontFamily="var(--font-inter)">TCA + 2 h</text>
            <text x={tcaX} y="182" fill={stroke} fontSize="10" textAnchor="middle" fontWeight="600" fontFamily="var(--font-inter)">
              min {formatDistance(event.minimumSeparationKm)}
            </text>
            <text x={PLOT_RIGHT} y={PLOT_TOP + 2} fill="var(--t3)" fontSize="9" textAnchor="end" fontFamily="var(--font-inter)">
              {formatDistance(maximum)}
            </text>
            <g fontSize="9" fontFamily="var(--font-inter)">
              <rect x={PLOT_RIGHT - 118} y="2" width="8" height="8" fill={stroke} />
              <text x={PLOT_RIGHT - 106} y="9" fill="var(--t3)">propagated</text>
              <line x1={PLOT_RIGHT - 48} y1="6" x2={PLOT_RIGHT - 40} y2="6" stroke="var(--t3)" strokeDasharray="3 3" />
              <text x={PLOT_RIGHT - 36} y="9" fill="var(--t3)">model</text>
            </g>
          </svg>
        ) : (
          <div className="flex h-[190px] items-center justify-center text-[11px] text-text-tertiary">Separation samples are unavailable for this event.</div>
        )}
      </div>
    </Panel>
  );
}
