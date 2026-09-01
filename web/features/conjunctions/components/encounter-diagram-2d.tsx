import type { ConjunctionEvent, ConjunctionObject } from "../types";
import { formatDistance } from "../formatters";
import { fitHalfKm, type EncounterModel, type Vec3 } from "../encounter-model";

const WIDTH = 640;
const HEIGHT = 320;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const VIEW_HALF_PX = 138;

const strokeByRisk: Record<ConjunctionEvent["risk"], string> = {
  CRITICAL: "var(--critical)",
  HIGH: "var(--high)",
  MEDIUM: "var(--medium)",
  LOW: "var(--low)",
};

interface DiagramProps {
  model: EncounterModel;
  offsetMinutes: number;
  risk: ConjunctionEvent["risk"];
  objectAType: ConjunctionObject["objectType"];
  objectBType: ConjunctionObject["objectType"];
}

function projectedHeading(vector: Vec3) {
  return (Math.atan2(-vector.y, vector.x) * 180) / Math.PI;
}

function ObjectGlyph({ x, y, heading, type, color, label }: {
  x: number;
  y: number;
  heading: number;
  type: ConjunctionObject["objectType"];
  color: string;
  label: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="13" fill={color} fillOpacity="0.07" stroke={color} strokeOpacity="0.2" />
      <circle r="9" fill="none" stroke={color} strokeOpacity="0.24" strokeDasharray="1 3" />
      <g transform={`rotate(${heading})`}>
        {type === "PAYLOAD" ? (
          <>
            <rect x="-12" y="-3.2" width="8" height="6.4" rx="0.8" fill="#17212b" stroke={color} strokeWidth="1" />
            <path d="M -10.5 -1.6 H -5.5 M -10.5 0 H -5.5 M -10.5 1.6 H -5.5" stroke={color} strokeOpacity="0.45" strokeWidth="0.55" />
            <rect x="4" y="-3.2" width="8" height="6.4" rx="0.8" fill="#17212b" stroke={color} strokeWidth="1" />
            <path d="M 5.5 -1.6 H 10.5 M 5.5 0 H 10.5 M 5.5 1.6 H 10.5" stroke={color} strokeOpacity="0.45" strokeWidth="0.55" />
            <rect x="-4" y="-4.6" width="8" height="9.2" rx="1.4" fill={color} stroke="#dbe8f1" strokeOpacity="0.65" strokeWidth="0.7" />
            <path d="M 4 0 L 7 -2.2 V 2.2 Z" fill="#dbe8f1" fillOpacity="0.75" />
          </>
        ) : type === "ROCKET BODY" ? (
          <>
            <path d="M -8 -3.8 H 6 L 10 0 L 6 3.8 H -8 Z" fill={color} stroke="#e8edf0" strokeOpacity="0.55" strokeWidth="0.7" />
            <path d="M -5 -3.8 V 3.8 M 5 -3.8 V 3.8" stroke="#111820" strokeOpacity="0.65" />
          </>
        ) : type === "DEBRIS" ? (
          <path d="M -8 -2 L -3 -7 L 3 -4 L 8 -1 L 5 6 L -2 4 L -7 6 Z" fill={color} stroke="#e8edf0" strokeOpacity="0.55" strokeWidth="0.7" />
        ) : (
          <path d="M 0 -7 L 7 0 L 0 7 L -7 0 Z" fill={color} stroke="#e8edf0" strokeOpacity="0.55" strokeWidth="0.7" />
        )}
      </g>
      <rect x="10" y="-18" width="13" height="12" rx="2" fill="#0b1015" fillOpacity="0.9" stroke={color} strokeOpacity="0.4" />
      <text x="16.5" y="-9.2" textAnchor="middle" fill={color} fontSize="8" fontWeight="700" fontFamily="var(--font-inter)">{label}</text>
    </g>
  );
}

export function EncounterDiagram2D({ model, offsetMinutes, risk, objectAType, objectBType }: DiagramProps) {
  const stroke = strokeByRisk[risk];
  const fitKm = fitHalfKm(model, offsetMinutes);
  const pxPerKm = VIEW_HALF_PX / fitKm;
  const midpoint = model.midpoint(offsetMinutes);

  const toPx = (point: Vec3) => ({
    x: CENTER_X + (point.x - midpoint.x) * pxPerKm,
    y: CENTER_Y - (point.y - midpoint.y) * pxPerKm,
  });

  const straightReachMinutes = model.speedKmS > 0 ? (fitKm * 40) / (model.speedKmS * 60) : 10;
  const halfMinutes = model.hasTrack ? model.trackHalfMinutes : straightReachMinutes;
  const sampleCount = model.hasTrack ? 48 : 2;
  const trackMinutesList = Array.from(
    { length: sampleCount },
    (_unused, index) => -halfMinutes + (index / (sampleCount - 1)) * 2 * halfMinutes,
  );
  const toPath = (position: (minutes: number) => Vec3) =>
    trackMinutesList
      .map((minutes, index) => {
        const point = toPx(position(minutes));
        return `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      })
      .join(" ");
  const trackPathA = toPath(model.positionA);
  const trackPathB = toPath(model.positionB);

  const markerA = toPx(model.positionA(offsetMinutes));
  const markerB = toPx(model.positionB(offsetMinutes));
  const tcaA = toPx(model.positionA(0));
  const tcaB = toPx(model.positionB(0));
  const tcaMidpoint = { x: (tcaA.x + tcaB.x) / 2, y: (tcaA.y + tcaB.y) / 2 };

  const velocityLength = 34;
  const arrowA = { x: markerA.x + model.velocityA.x * velocityLength, y: markerA.y - model.velocityA.y * velocityLength };
  const arrowB = { x: markerB.x + model.velocityB.x * velocityLength, y: markerB.y - model.velocityB.y * velocityLength };

  const uncertaintyRadius = model.radialUncertaintyKm
    ? model.radialUncertaintyKm * pxPerKm
    : null;
  const separationKm = model.separationAt(offsetMinutes);
  const gridOffsets = [-120, -80, -40, 40, 80, 120];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-[320px] w-full" role="img" aria-label="Projected encounter geometry in the encounter plane">
      <defs>
        <radialGradient id="encounter-plane-bg" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="#111b23" />
          <stop offset="55%" stopColor="#090d12" />
          <stop offset="100%" stopColor="#06080b" />
        </radialGradient>
        <filter id="encounter-track-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" /></filter>
        <marker id="encounter-arrow-a" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 8 4 L 0 8 Z" fill="var(--acc)" /></marker>
        <marker id="encounter-arrow-b" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 8 4 L 0 8 Z" fill="var(--high)" /></marker>
      </defs>

      <rect width={WIDTH} height={HEIGHT} fill="url(#encounter-plane-bg)" />

      {/* Local encounter-plane reference grid. It does not alter or snap geometry. */}
      <g stroke="#6e8799" strokeOpacity="0.08" strokeWidth="0.7">
        {gridOffsets.map((offset) => (
          <g key={offset}>
            <line x1={CENTER_X + offset} y1="16" x2={CENTER_X + offset} y2={HEIGHT - 16} />
            <line x1="16" y1={CENTER_Y + offset} x2={WIDTH - 16} y2={CENTER_Y + offset} />
          </g>
        ))}
      </g>
      {[40, 80, 120].map((radius) => <circle key={radius} cx={CENTER_X} cy={CENTER_Y} r={radius} fill="none" stroke="#7f9bad" strokeOpacity={0.1 - radius / 4000} />)}
      <line x1={CENTER_X} y1="16" x2={CENTER_X} y2={HEIGHT - 16} stroke="#7893a5" strokeOpacity="0.2" strokeDasharray="2 5" />
      <line x1="16" y1={CENTER_Y} x2={WIDTH - 16} y2={CENTER_Y} stroke="#7893a5" strokeOpacity="0.2" strokeDasharray="2 5" />

      {/* A soft underlay adds depth; the paths retain their computed coordinates. */}
      <path d={trackPathA} fill="none" stroke="var(--acc)" strokeWidth="7" opacity="0.14" filter="url(#encounter-track-glow)" />
      <path d={trackPathB} fill="none" stroke="var(--high)" strokeWidth="7" opacity="0.14" filter="url(#encounter-track-glow)" />
      <path d={trackPathA} fill="none" stroke="var(--acc)" strokeWidth="1.6" opacity="0.72" />
      <path d={trackPathB} fill="none" stroke="var(--high)" strokeWidth="1.6" opacity="0.72" />

      {/* TCA reticle and the computed miss vector. */}
      <circle cx={tcaMidpoint.x} cy={tcaMidpoint.y} r="18" fill="none" stroke={stroke} strokeOpacity="0.22" strokeDasharray="3 4" />
      <path d={`M ${tcaMidpoint.x - 24} ${tcaMidpoint.y} H ${tcaMidpoint.x - 10} M ${tcaMidpoint.x + 10} ${tcaMidpoint.y} H ${tcaMidpoint.x + 24} M ${tcaMidpoint.x} ${tcaMidpoint.y - 24} V ${tcaMidpoint.y - 10} M ${tcaMidpoint.x} ${tcaMidpoint.y + 10} V ${tcaMidpoint.y + 24}`} stroke={stroke} strokeOpacity="0.45" />
      <line x1={tcaA.x} y1={tcaA.y} x2={tcaB.x} y2={tcaB.y} stroke={stroke} strokeWidth="1.8" />
      <circle cx={tcaA.x} cy={tcaA.y} r="2.4" fill="var(--acc)" />
      <circle cx={tcaB.x} cy={tcaB.y} r="2.4" fill="var(--high)" />
      <rect x={tcaMidpoint.x + 6} y={tcaMidpoint.y - 20} width="92" height="17" rx="2" fill="#080b0e" fillOpacity="0.86" stroke={stroke} strokeOpacity="0.25" />
      <text x={tcaMidpoint.x + 12} y={tcaMidpoint.y - 8} fill={stroke} fontSize="9.5" fontWeight="600" fontFamily="var(--font-inter)">{formatDistance(model.missKm)} · TCA</text>

      {uncertaintyRadius ? <circle cx={markerA.x} cy={markerA.y} r={uncertaintyRadius} fill="var(--acc)" fillOpacity="0.045" stroke="var(--acc)" strokeOpacity="0.4" strokeDasharray="3 4" /> : null}

      {/* Current-epoch separation and velocity directions. */}
      <line x1={markerA.x} y1={markerA.y} x2={markerB.x} y2={markerB.y} stroke="#a4bdcd" strokeWidth="1" strokeDasharray="4 5" opacity="0.55" />
      {offsetMinutes !== 0 ? <text x={(markerA.x + markerB.x) / 2} y={(markerA.y + markerB.y) / 2 - 7} fill="#adc0cc" fontSize="9.5" textAnchor="middle" fontFamily="var(--font-inter)">{formatDistance(separationKm)}</text> : null}
      <line x1={markerA.x} y1={markerA.y} x2={arrowA.x} y2={arrowA.y} stroke="var(--acc)" strokeWidth="1.7" markerEnd="url(#encounter-arrow-a)" />
      <line x1={markerB.x} y1={markerB.y} x2={arrowB.x} y2={arrowB.y} stroke="var(--high)" strokeWidth="1.7" markerEnd="url(#encounter-arrow-b)" />

      <ObjectGlyph x={markerA.x} y={markerA.y} heading={projectedHeading(model.velocityA)} type={objectAType} color="var(--acc)" label="A" />
      <ObjectGlyph x={markerB.x} y={markerB.y} heading={projectedHeading(model.velocityB)} type={objectBType} color="var(--high)" label="B" />

      {/* Dynamic scale bar. All computed positions use this same uniform scale. */}
      <g>
        <rect x="12" y={HEIGHT - 42} width={VIEW_HALF_PX + 20} height="32" rx="3" fill="#070a0d" fillOpacity="0.82" stroke="#7f9bad" strokeOpacity="0.12" />
        <line x1="22" y1={HEIGHT - 20} x2={22 + VIEW_HALF_PX} y2={HEIGHT - 20} stroke="#9db2c0" strokeWidth="1.4" />
        <line x1="22" y1={HEIGHT - 24} x2="22" y2={HEIGHT - 16} stroke="#9db2c0" strokeWidth="1.4" />
        <line x1={22 + VIEW_HALF_PX} y1={HEIGHT - 24} x2={22 + VIEW_HALF_PX} y2={HEIGHT - 16} stroke="#9db2c0" strokeWidth="1.4" />
        <text x="22" y={HEIGHT - 27} fill="#9db2c0" fontSize="9.5" fontFamily="var(--font-inter)">{formatDistance(fitKm)}</text>
      </g>
      <text x={WIDTH - 18} y={HEIGHT - 26} fill="#8196a4" fontSize="9.5" textAnchor="end" fontFamily="var(--font-inter)">
        LOCAL ENCOUNTER PLANE · {model.encounterAngleDeg === null ? "ANGLE N/A" : `CROSSING ${model.encounterAngleDeg.toFixed(0)}°`}
      </text>
    </svg>
  );
}
