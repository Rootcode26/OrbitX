"use client";

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Billboard, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { EARTH_RADIUS_KM } from "@/features/globe/orbit-display-scale";
import { formatDistance } from "../formatters";
import type { ConjunctionEvent, ConjunctionObject } from "../types";
import { fitHalfKm, magnitude, type EncounterModel, type Vec3 } from "../encounter-model";
import { EncounterEarth } from "./encounter-earth";

const VIEW_HALF = 2.4;
const UP = new THREE.Vector3(0, 1, 0);

const riskHex: Record<ConjunctionEvent["risk"], number> = {
  CRITICAL: 0xe0674f,
  HIGH: 0xd08a3c,
  MEDIUM: 0xd8b24a,
  LOW: 0x6fa88a,
};

const OBJECT_A_HEX = 0x8fb4d6;
const OBJECT_B_HEX = 0xc79a51;

type SceneScale = "earth" | "encounter";

interface SceneProps {
  model: EncounterModel;
  offsetMinutes: number;
  risk: ConjunctionEvent["risk"];
  tcaIso: string | null;
  objectAName: string;
  objectBName: string;
  objectAType: ConjunctionObject["objectType"];
  objectBType: ConjunctionObject["objectType"];
}

const toVector = (point: Vec3) => new THREE.Vector3(point.x, point.y, point.z);

function toScene(point: Vec3, midpoint: Vec3, scale: number) {
  return new THREE.Vector3(
    (point.x - midpoint.x) * scale,
    (point.y - midpoint.y) * scale,
    (point.z - midpoint.z) * scale,
  );
}

function displayOrientation(model: EncounterModel) {
  if (!model.earthContext) {
    return new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.24, -0.38, 0));
  }

  // Put nadir at the bottom of the view and project relative velocity toward
  // screen-right. This is a rigid camera rotation; all distances are retained.
  const nadir = toVector(model.earthContext.centerKm).normalize();
  const screenUp = nadir.clone().negate();
  const relativeVelocityAxis = new THREE.Vector3(1, 0, 0);
  const screenRight = relativeVelocityAxis
    .clone()
    .sub(screenUp.clone().multiplyScalar(relativeVelocityAxis.dot(screenUp)));
  if (screenRight.lengthSq() < 1e-10) screenRight.set(0, 1, 0);
  screenRight.normalize();
  const screenOut = screenRight.clone().cross(screenUp).normalize();

  return new THREE.Matrix4().set(
    screenRight.x, screenRight.y, screenRight.z, 0,
    screenUp.x, screenUp.y, screenUp.z, 0,
    screenOut.x, screenOut.y, screenOut.z, 0,
    0, 0, 0, 1,
  );
}

function contextFitHalfKm(model: EncounterModel, offsetMinutes: number) {
  if (!model.earthContext) return fitHalfKm(model, offsetMinutes);
  const midpoint = model.midpoint(offsetMinutes);
  const fromEarth = {
    x: midpoint.x - model.earthContext.centerKm.x,
    y: midpoint.y - model.earthContext.centerKm.y,
    z: midpoint.z - model.earthContext.centerKm.z,
  };
  const altitudeKm = Math.max(magnitude(fromEarth) - EARTH_RADIUS_KM, 0);
  return Math.max(altitudeKm * 1.45, model.separationAt(offsetMinutes) * 1.2, 1);
}

function VelocityArrow({ origin, direction, hex }: { origin: THREE.Vector3; direction: Vec3; hex: number }) {
  const normalized = toVector(direction);
  if (normalized.lengthSq() === 0) return null;

  normalized.normalize();
  const tip = origin.clone().add(normalized.clone().multiplyScalar(0.48));
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, normalized);

  return (
    <>
      <Line points={[origin, tip]} color={hex} lineWidth={1.15} transparent opacity={0.72} />
      <mesh position={tip} quaternion={quaternion}>
        <coneGeometry args={[0.022, 0.068, 12]} />
        <meshBasicMaterial color={hex} transparent opacity={0.82} />
      </mesh>
    </>
  );
}

function TrackingMarker({ position, hex, designator, name }: {
  position: THREE.Vector3;
  hex: number;
  designator: string;
  name: string;
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.045, 24, 24]} />
        <meshStandardMaterial color={0xe7edf0} emissive={hex} emissiveIntensity={0.42} roughness={0.42} />
      </mesh>
      <Billboard>
        <mesh>
          <ringGeometry args={[0.08, 0.087, 40]} />
          <meshBasicMaterial color={hex} transparent opacity={0.72} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </Billboard>
      <Html position={[0.12, 0.1, 0]} center style={{ pointerEvents: "none" }}>
        <div className="flex max-w-44 items-center gap-1.5 whitespace-nowrap border border-white/10 bg-black/75 px-1.5 py-1 text-[8px] leading-none text-white/75 shadow-lg backdrop-blur-sm">
          <span className="numeric font-semibold" style={{ color: `#${hex.toString(16)}` }}>{designator}</span>
          <span className="max-w-36 truncate">{name}</span>
        </div>
      </Html>
    </group>
  );
}

function TcaReticle({ position, scale, risk }: {
  position: THREE.Vector3;
  scale: number;
  risk: ConjunctionEvent["risk"];
}) {
  return (
    <group position={position} scale={1 / scale}>
      <Billboard>
        <mesh>
          <ringGeometry args={[0.065, 0.073, 40]} />
          <meshBasicMaterial color={riskHex[risk]} transparent opacity={0.74} side={THREE.DoubleSide} />
        </mesh>
        <Line points={[[-0.13, 0, 0], [-0.085, 0, 0]]} color={riskHex[risk]} lineWidth={0.8} transparent opacity={0.55} />
        <Line points={[[0.085, 0, 0], [0.13, 0, 0]]} color={riskHex[risk]} lineWidth={0.8} transparent opacity={0.55} />
        <Line points={[[0, -0.13, 0], [0, -0.085, 0]]} color={riskHex[risk]} lineWidth={0.8} transparent opacity={0.55} />
        <Line points={[[0, 0.085, 0], [0, 0.13, 0]]} color={riskHex[risk]} lineWidth={0.8} transparent opacity={0.55} />
      </Billboard>
    </group>
  );
}

function TemporalTrack({
  position,
  minutes,
  offsetMinutes,
  color,
}: {
  position: (minutes: number) => Vec3;
  minutes: number[];
  offsetMinutes: number;
  color: number;
}) {
  const timeline = [...minutes, offsetMinutes]
    .sort((a, b) => a - b)
    .filter((value, index, values) => index === 0 || Math.abs(value - values[index - 1]) > 1e-8);
  const past = timeline.filter((value) => value <= offsetMinutes).map((value) => toVector(position(value)));
  const future = timeline.filter((value) => value >= offsetMinutes).map((value) => toVector(position(value)));

  return (
    <>
      {past.length > 1 ? <Line points={past} color={color} lineWidth={1.55} transparent opacity={0.82} /> : null}
      {future.length > 1 ? <Line points={future} color={color} lineWidth={1.05} transparent opacity={0.3} /> : null}
    </>
  );
}

function EncounterScene({ model, offsetMinutes, risk, tcaIso, objectAName, objectBName, sceneScale }: SceneProps & { sceneScale: SceneScale }) {
  const halfMinutes = model.hasTrack ? model.trackHalfMinutes : 10;
  const sampleCount = model.hasTrack ? Math.max(61, Math.round(halfMinutes * 6) * 2 + 1) : 2;
  const trackMinutes = Array.from(
    { length: sampleCount },
    (_unused, index) => -halfMinutes + (index / (sampleCount - 1)) * halfMinutes * 2,
  );
  const tcaA = toVector(model.positionA(0));
  const tcaB = toVector(model.positionB(0));
  const tcaMidpoint = tcaA.clone().add(tcaB).multiplyScalar(0.5);

  const fitKm = sceneScale === "earth"
    ? contextFitHalfKm(model, offsetMinutes)
    : fitHalfKm(model, offsetMinutes);
  const scale = VIEW_HALF / fitKm;
  const midpoint = model.midpoint(offsetMinutes);
  const groupPosition: [number, number, number] = [
    -midpoint.x * scale,
    -midpoint.y * scale,
    -midpoint.z * scale,
  ];
  const markerA = toScene(model.positionA(offsetMinutes), midpoint, scale);
  const markerB = toScene(model.positionB(offsetMinutes), midpoint, scale);
  const uncertaintyRadius = model.radialUncertaintyKm ? model.radialUncertaintyKm * scale : null;
  const orientation = useMemo(() => displayOrientation(model), [model]);
  const tcaMs = tcaIso ? new Date(tcaIso).getTime() : NaN;
  const epochMs = Number.isFinite(tcaMs) ? tcaMs + offsetMinutes * 60_000 : null;

  return (
    <group matrix={orientation} matrixAutoUpdate={false}>
      <group scale={scale} position={groupPosition}>
        {model.earthContext && epochMs !== null ? <EncounterEarth context={model.earthContext} epochMs={epochMs} /> : null}
        <TemporalTrack position={model.positionA} minutes={trackMinutes} offsetMinutes={offsetMinutes} color={OBJECT_A_HEX} />
        <TemporalTrack position={model.positionB} minutes={trackMinutes} offsetMinutes={offsetMinutes} color={OBJECT_B_HEX} />
        <Line points={[tcaA, tcaB]} color={riskHex[risk]} lineWidth={1.75} transparent opacity={0.9} />
        <mesh position={tcaA} scale={1 / scale}><sphereGeometry args={[0.018, 12, 12]} /><meshBasicMaterial color={OBJECT_A_HEX} /></mesh>
        <mesh position={tcaB} scale={1 / scale}><sphereGeometry args={[0.018, 12, 12]} /><meshBasicMaterial color={OBJECT_B_HEX} /></mesh>
        <TcaReticle position={tcaMidpoint} scale={scale} risk={risk} />
      </group>

      <TrackingMarker position={markerA} hex={OBJECT_A_HEX} designator="A" name={objectAName} />
      <TrackingMarker position={markerB} hex={OBJECT_B_HEX} designator="B" name={objectBName} />
      <VelocityArrow origin={markerA} direction={model.velocityA} hex={OBJECT_A_HEX} />
      <VelocityArrow origin={markerB} direction={model.velocityB} hex={OBJECT_B_HEX} />

      {uncertaintyRadius ? (
        <mesh position={markerA}>
          <sphereGeometry args={[uncertaintyRadius, 28, 20]} />
          <meshBasicMaterial color={OBJECT_A_HEX} transparent opacity={0.07} wireframe depthWrite={false} />
        </mesh>
      ) : null}

      <Line points={[markerA, markerB]} color={0xaab8c2} lineWidth={0.75} dashed dashSize={0.05} gapSize={0.04} transparent opacity={0.45} />
    </group>
  );
}

function formatObjectType(type: ConjunctionObject["objectType"]) {
  return type.replace("_", " ");
}

export function EncounterScene3D(props: SceneProps) {
  const hasEarthContext = props.model.earthContext !== null && props.tcaIso !== null;
  const [sceneScale, setSceneScale] = useState<SceneScale>(hasEarthContext ? "earth" : "encounter");

  return (
    <div className="relative h-[380px] w-full overflow-hidden bg-[#030507]">
      <Canvas
        camera={{ position: [0, 0.35, 5.7], fov: 40, near: 0.03, far: 250 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#030507"]} />
        <ambientLight intensity={0.28} />
        <directionalLight position={[-4, 3, 5]} intensity={1.35} color={0xf5f3eb} />
        <directionalLight position={[3, -2, 2]} intensity={0.18} color={0x5c829a} />
        <EncounterScene {...props} sceneScale={sceneScale} />
        <OrbitControls enablePan={false} enableDamping dampingFactor={0.075} minDistance={3} maxDistance={9} rotateSpeed={0.38} />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent px-3 py-2.5">
        <div>
          <div className="numeric text-[8.5px] font-semibold tracking-[0.12em] text-text-secondary">
            {hasEarthContext ? "TEME EARTH CONTEXT" : "LOCAL ENCOUNTER FRAME"}
          </div>
          <div className="mt-1 numeric text-[8px] text-text-tertiary">
            {hasEarthContext ? "Earth, positions and paths share one scale" : "Earth hidden · absolute state unavailable"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8.5px] text-text-tertiary">TCA miss vector</div>
          <div className="numeric mt-0.5 text-[10px] font-medium text-text-secondary">{formatDistance(props.model.missKm)}</div>
        </div>
      </div>

      {hasEarthContext ? (
        <div className="absolute top-[46px] left-3 flex border border-white/10 bg-black/60 text-[8.5px] backdrop-blur-sm">
          {(["earth", "encounter"] as SceneScale[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSceneScale(mode)}
              className={`h-6 px-2.5 capitalize transition-colors ${sceneScale === mode ? "bg-white/10 text-white/85" : "text-white/40 hover:text-white/70"}`}
            >
              {mode === "earth" ? "Earth context" : "Encounter scale"}
            </button>
          ))}
        </div>
      ) : null}

      <div className="pointer-events-none absolute right-3 bottom-2.5 flex max-w-[70%] items-center gap-3 numeric text-[8px] text-text-tertiary">
        <span className="truncate"><i className="mr-1.5 inline-block h-1.5 w-3 align-middle" style={{ background: `#${OBJECT_A_HEX.toString(16)}` }} />{props.objectAName} · {formatObjectType(props.objectAType)}</span>
        <span className="truncate"><i className="mr-1.5 inline-block h-1.5 w-3 align-middle" style={{ background: `#${OBJECT_B_HEX.toString(16)}` }} />{props.objectBName} · {formatObjectType(props.objectBType)}</span>
      </div>
      <div className="pointer-events-none absolute bottom-2.5 left-3 numeric text-[8px] text-text-tertiary">
        markers enlarged · drag to rotate · wheel to zoom
      </div>
    </div>
  );
}
