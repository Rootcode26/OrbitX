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

const toVecKm = (point: Vec3) => new THREE.Vector3(point.x, point.y, point.z);

function toScene(point: Vec3, midpoint: Vec3, scale: number) {
  return new THREE.Vector3(
    (point.x - midpoint.x) * scale,
    (point.y - midpoint.y) * scale,
    (point.z - midpoint.z) * scale,
  );
}

// Velocity vector as a line + cone, drawn in scene units so it stays a fixed
// on-screen size regardless of the current zoom.
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
  // ---- static geometry (depends only on the model) --------------------
  // Point arrays are stable across scrubbing, so the line geometry is never
  // rebuilt while the slider moves — only the framing group transform changes.
  const halfMinutes = model.hasTrack ? model.trackHalfMinutes : 60;
  const sampleCount = model.hasTrack ? 40 : 2;
  const trackMinutesList = Array.from(
    { length: sampleCount },
    (_unused, index) => -halfMinutes + (index / (sampleCount - 1)) * 2 * halfMinutes,
  );
  const trackAkm = trackMinutesList.map((minutes) => toVecKm(model.positionA(minutes)));
  const trackBkm = trackMinutesList.map((minutes) => toVecKm(model.positionB(minutes)));
  const tcaAkm = toVecKm(model.positionA(0));
  const tcaBkm = toVecKm(model.positionB(0));
  const tcaMidKm = tcaAkm.clone().add(tcaBkm).multiplyScalar(0.5);

  // ---- follow-cam framing (cheap, per offset) -------------------------
  const scale = VIEW_HALF / fitHalfKm(model, offsetMinutes);
  const midpoint = model.midpoint(offsetMinutes);
  const groupPosition: [number, number, number] = [
    -midpoint.x * scale,
    -midpoint.y * scale,
    -midpoint.z * scale,
  ];

  // ---- moving markers (scene units, aligned with the framed group) ----
  const markerA = toScene(model.positionA(offsetMinutes), midpoint, scale);
  const markerB = toScene(model.positionB(offsetMinutes), midpoint, scale);
  const uncertaintyRadius = model.radialUncertaintyKm
    ? Math.min(model.radialUncertaintyKm * scale, VIEW_HALF)
    : null;

  return (
    <group rotation={[0.34, -0.5, 0]}>
      {/* Static geometry, framed by the follow-cam group transform. */}
      <group scale={scale} position={groupPosition}>
        <Line points={trackAkm} color={OBJECT_A_HEX} lineWidth={1.4} transparent opacity={0.5} />
        <Line points={trackBkm} color={OBJECT_B_HEX} lineWidth={1.4} transparent opacity={0.5} />
        <Line points={[tcaAkm, tcaBkm]} color={riskHex[risk]} lineWidth={2} />
        <mesh position={tcaMidKm} scale={1 / scale}>
          <ringGeometry args={[0.05, 0.07, 24]} />
          <meshBasicMaterial color={riskHex[risk]} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      </group>

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
