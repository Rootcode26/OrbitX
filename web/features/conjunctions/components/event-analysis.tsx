import { Panel } from "@/components/ui/panel";
import { formatComputedTime, formatDistance } from "../formatters";
import type { ConjunctionEvent } from "../types";

const tones: Record<ConjunctionEvent["risk"], { text: string; bar: string }> = {
  CRITICAL: { text: "text-critical", bar: "bg-critical" },
  HIGH: { text: "text-high", bar: "bg-high" },
  MEDIUM: { text: "text-medium", bar: "bg-medium" },
  LOW: { text: "text-low", bar: "bg-low" },
};

function AnalysisRow({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex min-h-[39px] items-center justify-between gap-4 border-t border-[var(--bd2)] px-3.5">
      <span className="text-[10.5px] text-text-tertiary">{label}</span>
      <span className={`numeric text-[11.5px] font-medium text-text-primary ${valueClass}`}>{value}</span>
    </div>
  );
}

export function EventAnalysis({ event }: { event: ConjunctionEvent }) {
  const tone = tones[event.risk];

  return (
    <Panel title="Event analysis">
      <div className="px-3.5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] text-text-tertiary">Risk score</span>
          <span className={`numeric text-[12.5px] font-medium ${tone.text}`}>{event.riskScore.toFixed(1)} / 10</span>
        </div>
        <div className="mt-2 h-[3px] bg-[var(--bd2)]">
          <div className={`h-full ${tone.bar}`} style={{ width: `${event.riskScore * 10}%` }} />
        </div>
      </div>
      <AnalysisRow label="Minimum separation" value={formatDistance(event.minimumSeparationKm)} valueClass={tone.text} />
      <AnalysisRow label="Relative velocity" value={event.relativeVelocityKmS === null ? "—" : `${event.relativeVelocityKmS.toFixed(1)} km/s`} />
      <AnalysisRow label="Encounter angle" value={event.encounterAngleDegrees === null ? "—" : `${event.encounterAngleDegrees.toFixed(0)}°`} />
      <AnalysisRow label="Screening window" value={`${event.screeningWindowHours} h`} />
      <AnalysisRow label="Computed" value={formatComputedTime(event.computedAt)} />
    </Panel>
  );
}
