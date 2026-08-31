"use client";

import { Canvas } from "@react-three/fiber";
import { Line, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { ConjunctionEvent } from "../types";
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
}

function toVector(point: Vec3, midpoint: Vec3, scale: number) {
  return new THREE.Vector3(
    (point.x - midpoint.x) * scale,
    (point.y - midpoint.y) * scale,
    (point.z - midpoint.z) * scale,
  );
}

// Velocity vector drawn as a line + cone (cheap, disposed by the reconciler —
// no per-frame DOM work and no leaked ArrowHelper geometry).
function VelocityArrow({ origin, direction, hex }: { origin: THREE.Vector3; direction: Vec3; hex: number }) {
  const dir = new THREE.Vector3(direction.x, direction.y, direction.z);
  if (dir.lengthSq() === 0) return null;
  dir.normalize();
  const tip = origin.clone().add(dir.clone().multiplyScalar(0.9));
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, dir);
  return (
    <>
      <Line points={[origin, tip]} color={hex} lineWidth={2} />
      <mesh position={tip} quaternion={quaternion}>
        <coneGeometry args={[0.05, 0.16, 10]} />
        <meshBasicMaterial color={hex} />
      </mesh>
    </>
  );
}

function EncounterScene({ model, offsetMinutes, risk }: SceneProps) {
  const scale = VIEW_HALF / fitHalfKm(model, offsetMinutes);
  const midpoint = model.midpoint(offsetMinutes);

  const markerA = toVector(model.positionA(offsetMinutes), midpoint, scale);
  const markerB = toVector(model.positionB(offsetMinutes), midpoint, scale);
  const tcaMid = toVector(model.positionA(0), midpoint, scale).add(toVector(model.positionB(0), midpoint, scale)).multiplyScalar(0.5);
  const tcaA = toVector(model.positionA(0), midpoint, scale);
  const tcaB = toVector(model.positionB(0), midpoint, scale);

  const straightReachMinutes = model.speedKmS > 0 ? (fitHalfKm(model, offsetMinutes) * 60) / (model.speedKmS * 60) : 10;
  const halfMinutes = model.hasTrack ? model.trackHalfMinutes : straightReachMinutes;
  const sampleCount = model.hasTrack ? 40 : 2;
  const trackMinutesList = Array.from(
    { length: sampleCount },
    (_unused, index) => -halfMinutes + (index / (sampleCount - 1)) * 2 * halfMinutes,
  );
  const trackA = trackMinutesList.map((minutes) => toVector(model.positionA(minutes), midpoint, scale));
  const trackB = trackMinutesList.map((minutes) => toVector(model.positionB(minutes), midpoint, scale));

  const uncertaintyRadius = model.radialUncertaintyKm
    ? Math.min(model.radialUncertaintyKm * scale, VIEW_HALF)
    : null;

  return (
    <group rotation={[0.34, -0.5, 0]}>
      <Line points={trackA} color={OBJECT_A_HEX} lineWidth={1.4} transparent opacity={0.55} />
      <Line points={trackB} color={OBJECT_B_HEX} lineWidth={1.4} transparent opacity={0.55} />

      {/* Miss vector at the true closest approach. */}
      <Line points={[tcaA, tcaB]} color={riskHex[risk]} lineWidth={2} />
      <mesh position={tcaMid}>
        <ringGeometry args={[0.05, 0.07, 24]} />
        <meshBasicMaterial color={riskHex[risk]} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Object A. */}
      <mesh position={markerA}>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshStandardMaterial color={OBJECT_A_HEX} emissive={OBJECT_A_HEX} emissiveIntensity={0.5} roughness={0.4} />
      </mesh>
      <VelocityArrow origin={markerA} direction={model.velocityA} hex={OBJECT_A_HEX} />
      {uncertaintyRadius ? (
        <mesh position={markerA}>
          <sphereGeometry args={[uncertaintyRadius, 24, 24]} />
          <meshBasicMaterial color={OBJECT_A_HEX} transparent opacity={0.1} wireframe />
        </mesh>
      ) : null}

      {/* Object B. */}
      <mesh position={markerB}>
        <boxGeometry args={[0.14, 0.14, 0.14]} />
        <meshStandardMaterial color={OBJECT_B_HEX} emissive={OBJECT_B_HEX} emissiveIntensity={0.5} roughness={0.4} />
      </mesh>
      <VelocityArrow origin={markerB} direction={model.velocityB} hex={OBJECT_B_HEX} />

      {/* Live separation between the two objects. */}
      <Line points={[markerA, markerB]} color={0x8fafc4} lineWidth={1} dashed dashSize={0.08} gapSize={0.06} transparent opacity={0.45} />
    </group>
  );
}

export function EncounterScene3D(props: SceneProps) {
  return (
    <div className="relative h-[340px] w-full">
      <Canvas
        camera={{ position: [0, 1.4, 5.4], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0a0d11"]} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} color={0xfff1d8} />
        <directionalLight position={[-4, -2, -3]} intensity={0.35} color={0x3e7fa4} />
        <Stars radius={40} depth={22} count={350} factor={2.2} saturation={0.05} fade speed={0} />
        <EncounterScene {...props} />
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={3}
          maxDistance={9}
          rotateSpeed={0.5}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>
      <div className="pointer-events-none absolute right-3 bottom-2 flex items-center gap-3 numeric text-[9px] text-text-tertiary">
        <span><i className="mr-1 inline-block h-2 w-2 align-middle" style={{ background: `#${OBJECT_A_HEX.toString(16)}` }} />{props.objectAName}</span>
        <span><i className="mr-1 inline-block h-2 w-2 align-middle" style={{ background: `#${OBJECT_B_HEX.toString(16)}` }} />{props.objectBName}</span>
      </div>
      <div className="pointer-events-none absolute bottom-2 left-3 numeric text-[9px] text-text-tertiary">
        drag to orbit
      </div>
    </div>
  );
}
