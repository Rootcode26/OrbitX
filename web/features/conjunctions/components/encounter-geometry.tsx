"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Panel } from "@/components/ui/panel";
import { formatDistance } from "../formatters";
import { buildEncounterModel } from "../encounter-model";
import type { ConjunctionEvent } from "../types";
import { EncounterDiagram2D } from "./encounter-diagram-2d";

const EncounterScene3D = dynamic(
  () => import("./encounter-scene-3d").then((module) => module.EncounterScene3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] items-center justify-center text-[11px] text-text-tertiary">Loading 3D view…</div>
    ),
  },
);

type ViewMode = "2D" | "3D";

export function EncounterGeometry({ event }: { event: ConjunctionEvent }) {
  const [offsetMinutes, setOffsetMinutes] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("2D");
  const model = useMemo(() => buildEncounterModel(event), [event]);

  const separationKm = model.separationAt(offsetMinutes);
  const closingRate = offsetMinutes === 0 ? 0 : model.closingRateAt(offsetMinutes);

  return (
    <Panel
      title="Encounter geometry"
      meta={
        <span className="numeric">
          {model.exact ? "encounter plane" : "encounter plane · estimated"} · {model.encounterAngleDeg === null ? "angle unavailable" : `crossing ${model.encounterAngleDeg.toFixed(1)}°`}
        </span>
      }
    >
      <div className="bg-well">
        <div className="flex items-center justify-between px-4 pt-3 text-[10.5px] text-text-tertiary">
          <div className="flex items-center gap-4">
            <span><i className="mr-1.5 inline-block h-2 w-2 bg-accent" />{event.objectA.name}</span>
            <span><i className="mr-1.5 inline-block h-2 w-2 bg-high" />{event.objectB.name}</span>
          </div>
          <div className="flex border border-[var(--bd)]">
            {(["2D", "3D"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`numeric h-6 min-w-9 px-2.5 text-[9px] font-semibold transition-colors duration-120 ${viewMode === mode ? "bg-[var(--acc-tint)] text-[var(--acc-text)]" : "text-text-tertiary hover:text-text-primary"}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {!model.hasGeometry ? (
          <div className="flex h-[320px] items-center justify-center text-[11px] text-text-tertiary">
            Encounter geometry is unavailable for this event.
          </div>
        ) : viewMode === "3D" ? (
          <EncounterScene3D
            model={model}
            offsetMinutes={offsetMinutes}
            risk={event.risk}
            objectAName={event.objectA.name}
            objectBName={event.objectB.name}
          />
        ) : (
          <EncounterDiagram2D model={model} offsetMinutes={offsetMinutes} risk={event.risk} />
        )}

        <div className="flex items-center gap-4 border-y border-[var(--bd)] px-4 py-2.5">
          <span className="numeric whitespace-nowrap text-[10.5px] text-text-tertiary">TCA − 10 min</span>
          <input
            type="range"
            min={-10}
            max={10}
            step={0.5}
            value={offsetMinutes}
            onChange={(changeEvent) => setOffsetMinutes(Number(changeEvent.target.value))}
            className="h-1 flex-1 cursor-pointer accent-[var(--acc)]"
          />
          <span className="numeric whitespace-nowrap text-[10.5px] text-text-tertiary">+ 10 min</span>
          <button onClick={() => setOffsetMinutes(0)} className="whitespace-nowrap text-[10.5px] text-[var(--acc-text)] hover:text-[var(--acc-hover)]">
            Snap to TCA
          </button>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-[var(--bd2)] border-b border-[var(--bd2)] min-[1000px]:grid-cols-4 min-[1000px]:divide-y-0">
          <GeometryStat label="Epoch" value={`T ${offsetMinutes >= 0 ? "+" : "−"}${Math.abs(offsetMinutes).toFixed(1)} min`} />
          <GeometryStat label="Separation" value={formatDistance(separationKm)} />
          <GeometryStat label="Closing rate" value={`${closingRate >= 0 ? "+" : "−"}${Math.abs(closingRate).toFixed(2)} km/s`} />
          <GeometryStat label="Minimum separation" value={formatDistance(model.missKm)} />
        </div>
      </div>
    </Panel>
  );
}

function GeometryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3.5 py-2.5">
      <div className="text-[10px] font-medium text-text-tertiary">{label}</div>
      <div className="numeric mt-1 text-[11.5px] font-medium text-text-primary">{value}</div>
    </div>
  );
}
