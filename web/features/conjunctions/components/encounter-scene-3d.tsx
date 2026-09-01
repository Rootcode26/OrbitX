"use client";

import { Canvas } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { formatDistance } from "../formatters";
import type { ConjunctionEvent, ConjunctionObject } from "../types";
import { fitHalfKm, type EncounterModel, type Vec3 } from "../encounter-model";

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

interface SceneProps {
  model: EncounterModel;
  offsetMinutes: number;
  risk: ConjunctionEvent["risk"];
  objectAName: string;
  objectBName: string;
  objectAType: ConjunctionObject["objectType"];
  objectBType: ConjunctionObject["objectType"];
}

const toVecKm = (point: Vec3) => new THREE.Vector3(point.x, point.y, point.z);

function toScene(point: Vec3, midpoint: Vec3, scale: number) {
  return new THREE.Vector3(
    (point.x - midpoint.x) * scale,
    (point.y - midpoint.y) * scale,
    (point.z - midpoint.z) * scale,
  );
}

function VelocityArrow({ origin, direction, hex }: { origin: THREE.Vector3; direction: Vec3; hex: number }) {
  const normalized = new THREE.Vector3(direction.x, direction.y, direction.z);
  if (normalized.lengthSq() === 0) return null;

  normalized.normalize();
  const tip = origin.clone().add(normalized.clone().multiplyScalar(0.62));
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, normalized);

  return (
    <>
      <Line points={[origin, tip]} color={hex} lineWidth={1.2} transparent opacity={0.72} />
      <mesh position={tip} quaternion={quaternion}>
        <coneGeometry args={[0.025, 0.08, 12]} />
        <meshBasicMaterial color={hex} transparent opacity={0.82} />
      </mesh>
    </>
  );
}

function TrackingMarker({ position, hex }: { position: THREE.Vector3; hex: number }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.055, 24, 24]} />
        <meshStandardMaterial color={0xe5edf2} emissive={hex} emissiveIntensity={0.48} metalness={0.35} roughness={0.38} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.095, 18, 18]} />
        <meshBasicMaterial color={hex} transparent opacity={0.08} depthWrite={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.105, 0.112, 40]} />
        <meshBasicMaterial color={hex} transparent opacity={0.58} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function TcaMarker({ position, scale, risk }: {
  position: THREE.Vector3;
  scale: number;
  risk: ConjunctionEvent["risk"];
}) {
  return (
    <group position={position} scale={1 / scale}>
      <mesh>
        <ringGeometry args={[0.075, 0.084, 40]} />
        <meshBasicMaterial color={riskHex[risk]} transparent opacity={0.72} side={THREE.DoubleSide} />
      </mesh>
      <Line points={[[-0.15, 0, 0], [-0.095, 0, 0]]} color={riskHex[risk]} lineWidth={0.8} transparent opacity={0.5} />
      <Line points={[[0.095, 0, 0], [0.15, 0, 0]]} color={riskHex[risk]} lineWidth={0.8} transparent opacity={0.5} />
      <Line points={[[0, -0.15, 0], [0, -0.095, 0]]} color={riskHex[risk]} lineWidth={0.8} transparent opacity={0.5} />
      <Line points={[[0, 0.095, 0], [0, 0.15, 0]]} color={riskHex[risk]} lineWidth={0.8} transparent opacity={0.5} />
    </group>
  );
}

function EncounterScene({ model, offsetMinutes, risk }: SceneProps) {
  // Only display the real dense-track window when it exists. Fallback paths
  // are limited to the same ±10-minute UI interval and remain clearly linear.
  const halfMinutes = model.hasTrack ? model.trackHalfMinutes : 10;
  const sampleCount = model.hasTrack ? 80 : 2;
  const trackMinutes = Array.from(
    { length: sampleCount },
    (_unused, index) => -halfMinutes + (index / (sampleCount - 1)) * halfMinutes * 2,
  );
  const trackA = trackMinutes.map((minutes) => toVecKm(model.positionA(minutes)));
  const trackB = trackMinutes.map((minutes) => toVecKm(model.positionB(minutes)));
  const tcaA = toVecKm(model.positionA(0));
  const tcaB = toVecKm(model.positionB(0));
  const tcaMidpoint = tcaA.clone().add(tcaB).multiplyScalar(0.5);

  const scale = VIEW_HALF / fitHalfKm(model, offsetMinutes);
  const midpoint = model.midpoint(offsetMinutes);
  const groupPosition: [number, number, number] = [
    -midpoint.x * scale,
    -midpoint.y * scale,
    -midpoint.z * scale,
  ];
  const markerA = toScene(model.positionA(offsetMinutes), midpoint, scale);
  const markerB = toScene(model.positionB(offsetMinutes), midpoint, scale);
  const uncertaintyRadius = model.radialUncertaintyKm ? model.radialUncertaintyKm * scale : null;

  return (
    <group rotation={[0.26, -0.42, 0]}>
      <group scale={scale} position={groupPosition}>
        <Line points={trackA} color={OBJECT_A_HEX} lineWidth={1.35} transparent opacity={0.66} />
        <Line points={trackB} color={OBJECT_B_HEX} lineWidth={1.35} transparent opacity={0.66} />
        <Line points={[tcaA, tcaB]} color={riskHex[risk]} lineWidth={1.8} transparent opacity={0.88} />
        <mesh position={tcaA} scale={1 / scale}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshBasicMaterial color={OBJECT_A_HEX} />
        </mesh>
        <mesh position={tcaB} scale={1 / scale}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshBasicMaterial color={OBJECT_B_HEX} />
        </mesh>
        <TcaMarker position={tcaMidpoint} scale={scale} risk={risk} />
      </group>

      <TrackingMarker position={markerA} hex={OBJECT_A_HEX} />
      <TrackingMarker position={markerB} hex={OBJECT_B_HEX} />
      <VelocityArrow origin={markerA} direction={model.velocityA} hex={OBJECT_A_HEX} />
      <VelocityArrow origin={markerB} direction={model.velocityB} hex={OBJECT_B_HEX} />

      {uncertaintyRadius ? (
        <mesh position={markerA}>
          <sphereGeometry args={[uncertaintyRadius, 28, 20]} />
          <meshBasicMaterial color={OBJECT_A_HEX} transparent opacity={0.07} wireframe depthWrite={false} />
        </mesh>
      ) : null}

      <Line
        points={[markerA, markerB]}
        color={0xaab8c2}
        lineWidth={0.8}
        dashed
        dashSize={0.055}
        gapSize={0.045}
        transparent
        opacity={0.42}
      />
    </group>
  );
}

function formatObjectType(type: ConjunctionObject["objectType"]) {
  return type.replace("_", " ");
}

export function EncounterScene3D(props: SceneProps) {
  return (
    <div className="relative h-[340px] w-full overflow-hidden bg-[#050608]">
      <Canvas
        camera={{ position: [0, 1.1, 5.5], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#050608"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 4, 5]} intensity={0.9} color={0xf3f5f6} />
        <directionalLight position={[-3, -2, 2]} intensity={0.22} color={0x668aa1} />
        <EncounterScene {...props} />
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={3.2}
          maxDistance={8}
          rotateSpeed={0.42}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/55 to-transparent px-3 py-2.5">
        <div>
          <div className="numeric text-[8.5px] font-semibold tracking-[0.12em] text-text-secondary">LOCAL ENCOUNTER FRAME</div>
          <div className="mt-1 numeric text-[8px] text-text-tertiary">X relative velocity · Y miss axis · Z normal</div>
        </div>
        <div className="text-right">
          <div className="text-[8.5px] text-text-tertiary">TCA miss vector</div>
          <div className="numeric mt-0.5 text-[10px] font-medium text-text-secondary">{formatDistance(props.model.missKm)}</div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 bottom-2.5 flex items-center gap-3 numeric text-[8.5px] text-text-tertiary">
        <span><i className="mr-1.5 inline-block h-1.5 w-3 align-middle" style={{ background: `#${OBJECT_A_HEX.toString(16)}` }} />{props.objectAName} · {formatObjectType(props.objectAType)}</span>
        <span><i className="mr-1.5 inline-block h-1.5 w-3 align-middle" style={{ background: `#${OBJECT_B_HEX.toString(16)}` }} />{props.objectBName} · {formatObjectType(props.objectBType)}</span>
      </div>
      <div className="pointer-events-none absolute bottom-2.5 left-3 numeric text-[8.5px] text-text-tertiary">
        drag to rotate · wheel to zoom
      </div>
    </div>
  );
}
