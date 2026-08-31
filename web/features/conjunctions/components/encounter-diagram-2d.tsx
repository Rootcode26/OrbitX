import type { ConjunctionEvent } from "../types";
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
}

export function EncounterDiagram2D({ model, offsetMinutes, risk }: DiagramProps) {
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

  const velocityLength = 32;
  const arrowA = {
    x: markerA.x + model.velocityA.x * velocityLength,
    y: markerA.y - model.velocityA.y * velocityLength,
  };
  const arrowB = {
    x: markerB.x + model.velocityB.x * velocityLength,
    y: markerB.y - model.velocityB.y * velocityLength,
  };

  const uncertaintyRadius = model.radialUncertaintyKm
    ? Math.min(model.radialUncertaintyKm * pxPerKm, VIEW_HALF_PX)
    : null;
  const separationKm = model.separationAt(offsetMinutes);
  const scaleBarKm = fitKm; // half-view width in km

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-[320px] w-full" role="img" aria-label="Projected encounter geometry in the encounter plane">
      <defs>
        <marker id="encounter-arrow-a" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="var(--acc)" />
        </marker>
        <marker id="encounter-arrow-b" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="var(--high)" />
        </marker>
      </defs>

      {/* Reference grid at the framed midpoint. */}
      <line x1={CENTER_X} y1="18" x2={CENTER_X} y2={HEIGHT - 18} stroke="var(--bd2)" strokeDasharray="3 6" />
      <line x1="18" y1={CENTER_Y} x2={WIDTH - 18} y2={CENTER_Y} stroke="var(--bd2)" strokeDasharray="3 6" />

      {/* Object tracks — the visible crossing angle is the real encounter angle. */}
      <path d={trackPathA} fill="none" stroke="var(--acc)" strokeWidth="1.6" opacity="0.5" />
      <path d={trackPathB} fill="none" stroke="var(--high)" strokeWidth="1.6" opacity="0.5" />

      {/* Miss vector at true closest approach. */}
      <line x1={tcaA.x} y1={tcaA.y} x2={tcaB.x} y2={tcaB.y} stroke={stroke} strokeWidth="1.6" />
      <circle cx={(tcaA.x + tcaB.x) / 2} cy={(tcaA.y + tcaB.y) / 2} r="3" fill={stroke} />
      <text x={(tcaA.x + tcaB.x) / 2 + 8} y={(tcaA.y + tcaB.y) / 2 - 6} fill={stroke} fontSize="10" fontWeight="600" fontFamily="var(--font-inter)">
        {formatDistance(model.missKm)} @ TCA
      </text>

      {/* Combined position uncertainty. */}
      {uncertaintyRadius ? (
        <circle cx={markerA.x} cy={markerA.y} r={uncertaintyRadius} fill="var(--acc)" fillOpacity="0.06" stroke="var(--acc-border)" strokeDasharray="3 4" />
      ) : null}

      {/* Live separation between the two objects at the current epoch. */}
      <line x1={markerA.x} y1={markerA.y} x2={markerB.x} y2={markerB.y} stroke="var(--t3)" strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />
      {offsetMinutes !== 0 ? (
        <text x={(markerA.x + markerB.x) / 2} y={(markerA.y + markerB.y) / 2 - 6} fill="var(--t2)" fontSize="9.5" textAnchor="middle" fontFamily="var(--font-inter)">
          {formatDistance(separationKm)}
        </text>
      ) : null}

      {/* Velocity vectors. */}
      <line x1={markerA.x} y1={markerA.y} x2={arrowA.x} y2={arrowA.y} stroke="var(--acc)" strokeWidth="2" markerEnd="url(#encounter-arrow-a)" />
      <line x1={markerB.x} y1={markerB.y} x2={arrowB.x} y2={arrowB.y} stroke="var(--high)" strokeWidth="2" markerEnd="url(#encounter-arrow-b)" />

      {/* Objects. */}
      <circle cx={markerA.x} cy={markerA.y} r="5" fill="var(--acc)" />
      <rect x={markerB.x - 5} y={markerB.y - 5} width="10" height="10" fill="var(--high)" />

      {/* Dynamic scale bar. */}
      <line x1="18" y1={HEIGHT - 20} x2={18 + VIEW_HALF_PX} y2={HEIGHT - 20} stroke="var(--t3)" strokeWidth="1.5" />
      <line x1="18" y1={HEIGHT - 24} x2="18" y2={HEIGHT - 16} stroke="var(--t3)" strokeWidth="1.5" />
      <line x1={18 + VIEW_HALF_PX} y1={HEIGHT - 24} x2={18 + VIEW_HALF_PX} y2={HEIGHT - 16} stroke="var(--t3)" strokeWidth="1.5" />
      <text x="18" y={HEIGHT - 26} fill="var(--t3)" fontSize="9.5" fontFamily="var(--font-inter)">{formatDistance(scaleBarKm)}</text>
      <text x={WIDTH - 18} y={HEIGHT - 26} fill="var(--t3)" fontSize="9.5" textAnchor="end" fontFamily="var(--font-inter)">
        {model.encounterAngleDeg === null ? "angle n/a" : `crossing ${model.encounterAngleDeg.toFixed(0)}°`}
      </text>
    </svg>
  );
}
