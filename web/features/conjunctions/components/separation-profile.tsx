import { Panel } from "@/components/ui/panel";
import { formatDistance } from "../formatters";
import type { ConjunctionEvent } from "../types";

const strokeByRisk: Record<ConjunctionEvent["risk"], string> = {
  CRITICAL: "var(--critical)",
  HIGH: "var(--high)",
  MEDIUM: "var(--medium)",
  LOW: "var(--low)",
};

export function SeparationProfile({ event }: { event: ConjunctionEvent }) {
  const stroke = strokeByRisk[event.risk];
  const tcaTime = event.tcaIso ? new Date(event.tcaIso).getTime() : NaN;
  const windowMs = 2 * 60 * 60 * 1000;
  const samples = event.separationProfile.filter((sample) => {
    const time = new Date(sample.timestamp).getTime();
    return Number.isFinite(tcaTime) && Math.abs(time - tcaTime) <= windowMs;
  });
  const displayedSamples = samples.length > 1 ? samples : event.separationProfile;
  const separations = displayedSamples.map((sample) => sample.separationKm);
  const minimum = separations.length ? Math.min(...separations) : 0;
  const maximum = separations.length ? Math.max(...separations) : 1;
  const range = Math.max(maximum - minimum, 0.001);
  const path = displayedSamples.map((sample, index) => {
    const x = 12 + index / Math.max(displayedSamples.length - 1, 1) * 616;
    const y = 145 - (sample.separationKm - minimum) / range * 117;
    return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
  const minimumIndex = separations.indexOf(minimum);
  const minimumX = 12 + Math.max(minimumIndex, 0) / Math.max(displayedSamples.length - 1, 1) * 616;

  return (
    <Panel
      title="Separation profile"
      meta={<span className="numeric">TCA ± 2 h · {displayedSamples.length} propagated samples</span>}
    >
      <div className="bg-well px-3 py-2">
        {displayedSamples.length > 1 ? <svg viewBox="0 0 640 190" className="block h-[190px] w-full" role="img" aria-label="Separation over four hours around closest approach">
          <line x1="320" y1="18" x2="320" y2="158" stroke="var(--bd)" />
          <line x1="12" y1="96" x2="628" y2="96" stroke="var(--bd2)" strokeDasharray="4 5" />
          <path
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth="2"
          />
          <circle cx={minimumX} cy="145" r="5" fill={stroke} />
          <text x="12" y="182" fill="var(--t3)" fontSize="10" fontFamily="var(--font-inter)">TCA − 2 h</text>
          <text x="628" y="182" fill="var(--t3)" fontSize="10" textAnchor="end" fontFamily="var(--font-inter)">TCA + 2 h</text>
          <text x="320" y="182" fill={stroke} fontSize="10" textAnchor="middle" fontWeight="600" fontFamily="var(--font-inter)">
            min {formatDistance(event.minimumSeparationKm)}
          </text>
        </svg> : <div className="flex h-[190px] items-center justify-center text-[11px] text-text-tertiary">Separation samples are unavailable for this event.</div>}
      </div>
    </Panel>
  );
}
