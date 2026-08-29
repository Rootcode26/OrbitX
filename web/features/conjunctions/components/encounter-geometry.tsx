"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { formatDistance } from "../formatters";
import type { ConjunctionEvent } from "../types";

interface Point {
  x: number;
  y: number;
}

const riskColor = {
  CRITICAL: "var(--critical)",
  HIGH: "var(--high)",
  MEDIUM: "var(--medium)",
  LOW: "var(--low)",
} as const;

const riskBorder = {
  CRITICAL: "var(--critical-border)",
  HIGH: "var(--high-border)",
  MEDIUM: "var(--medium-border)",
  LOW: "var(--low-border)",
} as const;

function quadraticPoint(start: Point, control: Point, end: Point, progress: number) {
  const inverse = 1 - progress;
  return {
    x: inverse * inverse * start.x + 2 * inverse * progress * control.x + progress * progress * end.x,
    y: inverse * inverse * start.y + 2 * inverse * progress * control.y + progress * progress * end.y,
  };
}

function quadraticTangent(start: Point, control: Point, end: Point, progress: number) {
  return {
    x: 2 * (1 - progress) * (control.x - start.x) + 2 * progress * (end.x - control.x),
    y: 2 * (1 - progress) * (control.y - start.y) + 2 * progress * (end.y - control.y),
  };
}

function vectorEnd(origin: Point, tangent: Point, length = 34) {
  const magnitude = Math.hypot(tangent.x, tangent.y) || 1;
  return {
    x: origin.x + (tangent.x / magnitude) * length,
    y: origin.y + (tangent.y / magnitude) * length,
  };
}

export function EncounterGeometry({ event }: { event: ConjunctionEvent }) {
  const [offsetMinutes, setOffsetMinutes] = useState(0);
  const progress = offsetMinutes / 10;
  const targetTime = event.tcaIso ? new Date(event.tcaIso).getTime() + offsetMinutes * 60_000 : NaN;
  const sample = event.separationProfile.reduce<typeof event.separationProfile[number] | null>((closest, candidate) => {
    if (!Number.isFinite(targetTime)) return closest;
    if (!closest) return candidate;
    const candidateDistance = Math.abs(new Date(candidate.timestamp).getTime() - targetTime);
    const closestDistance = Math.abs(new Date(closest.timestamp).getTime() - targetTime);
    return candidateDistance < closestDistance ? candidate : closest;
  }, null);
  const fallbackSeparation = event.minimumSeparationKm === null
    ? null
    : event.minimumSeparationKm + Math.pow(Math.abs(progress), 1.7) * event.profileSpanKm;
  const isAtTca = offsetMinutes === 0;
  const separationKm = isAtTca
    ? event.minimumSeparationKm
    : sample?.separationKm ?? fallbackSeparation;
  const closingRate = isAtTca ? 0 : sample?.closingRateKmS ?? null;
  const minimumSeparation = event.minimumSeparationKm ?? 0;
  const trackSpanKm = Math.max(event.profileSpanKm, minimumSeparation, 1);
  const tcaGap = Math.min(120, Math.max(18, (minimumSeparation / trackSpanKm) * 520));
  const halfGap = tcaGap / 2;
  const objectATca = { x: 450 - halfGap, y: 120 };
  const objectBTca = { x: 450 + halfGap, y: 120 };
  const objectAStart = { x: 190 - halfGap, y: 205 };
  const objectAControl = { x: 450 - halfGap, y: 35 };
  const objectAEnd = { x: 710 - halfGap, y: 205 };
  const objectAProgress = (progress + 1) / 2;
  const objectAPoint = quadraticPoint(objectAStart, objectAControl, objectAEnd, objectAProgress);
  const objectATangent = quadraticTangent(objectAStart, objectAControl, objectAEnd, objectAProgress);
  const objectBStart = { x: 670 + halfGap, y: 25 };
  const objectBFirstControl = { x: 500 + halfGap, y: 55 };
  const objectBSecondControl = { x: 400 + halfGap, y: 185 };
  const objectBEnd = { x: 250 + halfGap, y: 225 };
  const objectBPoint = progress <= 0
    ? quadraticPoint(
        objectBStart,
        objectBFirstControl,
        objectBTca,
        progress + 1,
      )
    : quadraticPoint(
        objectBTca,
        objectBSecondControl,
        objectBEnd,
        progress,
      );
  const objectBTangent = progress <= 0
    ? quadraticTangent(objectBStart, objectBFirstControl, objectBTca, progress + 1)
    : quadraticTangent(objectBTca, objectBSecondControl, objectBEnd, progress);
  const objectAVectorEnd = vectorEnd(objectAPoint, objectATangent);
  const objectBVectorEnd = vectorEnd(objectBPoint, objectBTangent);
  const encounterColor = riskColor[event.risk];
  const encounterBorder = riskBorder[event.risk];

  return (
    <Panel
      title="Encounter geometry"
      meta={`projected into the encounter plane · crossing angle ${event.encounterAngleDegrees === null ? "unavailable" : `${event.encounterAngleDegrees.toFixed(1)}°`}`}
    >
      <div className="bg-well">
        <div className="flex items-center justify-between px-4 pt-3 text-[10.5px] text-text-tertiary">
          <span className="numeric">{event.profileSpanKm > 0 ? `${event.profileSpanKm.toLocaleString()} km across · ` : ""}±10 min of track</span>
          <div className="flex items-center gap-4">
            <span><i className="mr-1.5 inline-block h-2 w-2 bg-accent" />{event.objectA.name}</span>
            <span><i className="mr-1.5 inline-block h-2 w-2 bg-high" />{event.objectB.name}</span>
          </div>
        </div>
        <svg viewBox="0 0 900 320" className="block h-[310px] w-full" role="img" aria-label="Projected paths of the two objects near closest approach">
          <defs>
            <marker id="velocity-a-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 Z" fill="var(--acc)" />
            </marker>
            <marker id="velocity-b-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 Z" fill="var(--high)" />
            </marker>
          </defs>
          <path d={`M ${objectAStart.x} ${objectAStart.y} Q ${objectAControl.x} ${objectAControl.y} ${objectAEnd.x} ${objectAEnd.y}`} fill="none" stroke="var(--acc)" strokeWidth="2" opacity="0.78" />
          <path d={`M ${objectBStart.x} ${objectBStart.y} Q ${objectBFirstControl.x} ${objectBFirstControl.y} ${objectBTca.x} ${objectBTca.y} Q ${objectBSecondControl.x} ${objectBSecondControl.y} ${objectBEnd.x} ${objectBEnd.y}`} fill="none" stroke="var(--high)" strokeWidth="2" opacity="0.78" />
          <path d="M 105 320 Q 450 245 795 320 L 795 330 L 105 330 Z" fill="#101115" stroke="none" />
          <path d="M 105 320 Q 450 245 795 320" fill="none" stroke="#39444d" strokeWidth="1.5" />
          <path d="M 92 320 Q 450 235 808 320" fill="none" stroke="rgba(143,175,196,.13)" strokeWidth="5" />
          <text x="450" y="176" fill="var(--t3)" textAnchor="middle" fontSize="10" fontFamily="var(--font-inter)">TCA MISS VECTOR</text>
          <ellipse cx="450" cy="120" rx={halfGap + 18} ry="26" fill="none" stroke={encounterBorder} strokeDasharray="4 6" />
          <line x1={objectATca.x} y1={objectATca.y} x2={objectBTca.x} y2={objectBTca.y} stroke={encounterColor} strokeWidth="1.5" />
          <path d={`M ${objectATca.x + 8} ${objectATca.y - 5} L ${objectATca.x} ${objectATca.y} L ${objectATca.x + 8} ${objectATca.y + 5} M ${objectBTca.x - 8} ${objectBTca.y - 5} L ${objectBTca.x} ${objectBTca.y} L ${objectBTca.x - 8} ${objectBTca.y + 5}`} fill="none" stroke={encounterColor} />
          <text x="450" y="88" fill={encounterColor} textAnchor="middle" fontSize="12" fontWeight="600" fontFamily="var(--font-inter)">
            {formatDistance(event.minimumSeparationKm)}
          </text>
          <line
            x1={objectAPoint.x}
            y1={objectAPoint.y}
            x2={objectAVectorEnd.x}
            y2={objectAVectorEnd.y}
            stroke="var(--acc)"
            strokeWidth="2"
            markerEnd="url(#velocity-a-arrow)"
          />
          <line
            x1={objectBPoint.x}
            y1={objectBPoint.y}
            x2={objectBVectorEnd.x}
            y2={objectBVectorEnd.y}
            stroke="var(--high)"
            strokeWidth="2"
            markerEnd="url(#velocity-b-arrow)"
          />
          <circle cx={objectAPoint.x} cy={objectAPoint.y} r="5" fill="var(--acc)" />
          <rect x={objectBPoint.x - 5} y={objectBPoint.y - 5} width="10" height="10" fill="var(--high)" />
          <text x="14" y="304" fill="var(--t3)" fontSize="10" fontFamily="var(--font-inter)">Earth limb · altitude reference only</text>
        </svg>
        <div className="flex items-center gap-4 border-y border-[var(--bd)] px-4 py-2.5">
          <span className="numeric whitespace-nowrap text-[10.5px] text-text-tertiary">TCA − 10 min</span>
          <input
            type="range"
            min={-10}
            max={10}
            step={0.5}
            value={offsetMinutes}
            onChange={(event) => setOffsetMinutes(Number(event.target.value))}
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
          <GeometryStat label="Closing rate" value={closingRate === null ? "—" : `${closingRate >= 0 ? "+" : "−"}${Math.abs(closingRate).toFixed(2)} km/s`} />
          <GeometryStat label="Minimum separation" value={formatDistance(event.minimumSeparationKm)} />
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
