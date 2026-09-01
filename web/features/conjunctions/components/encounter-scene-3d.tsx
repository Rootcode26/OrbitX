"use client";

import { Canvas } from "@react-three/fiber";
import { Line, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { ConjunctionEvent, ConjunctionObject } from "../types";
import { fitHalfKm, type EncounterModel, type Vec3 } from "../encounter-model";

const VIEW_HALF = 2.4;
const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(1, 0, 0);

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

function PayloadModel({ hex }: { hex: number }) {
  return (
    <>
      <mesh>
        <boxGeometry args={[0.2, 0.14, 0.14]} />
        <meshStandardMaterial color={hex} metalness={0.72} roughness={0.28} emissive={hex} emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0.12, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <coneGeometry args={[0.065, 0.12, 16]} />
        <meshStandardMaterial color={0xd9e3e9} metalness={0.8} roughness={0.22} />
      </mesh>
      {[-0.29, 0.29].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh>
            <boxGeometry args={[0.36, 0.018, 0.2]} />
            <meshStandardMaterial color={0x193c62} emissive={0x285d8d} emissiveIntensity={0.24} metalness={0.25} roughness={0.38} />
          </mesh>
          <Line points={[[-0.18, 0.011, 0], [0.18, 0.011, 0]]} color={0x6f9bc0} lineWidth={0.5} transparent opacity={0.65} />
        </group>
      ))}
      <mesh position={[-0.12, 0.11, 0]}>
        <cylinderGeometry args={[0.045, 0.055, 0.06, 16]} />
        <meshStandardMaterial color={0x9dafbc} metalness={0.7} roughness={0.3} />
      </mesh>
    </>
  );
}

function RocketBodyModel({ hex }: { hex: number }) {
  return (
    <group rotation={[0, 0, -Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[0.09, 0.075, 0.42, 18]} />
        <meshStandardMaterial color={hex} metalness={0.76} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.23, 0]}>
        <coneGeometry args={[0.075, 0.08, 18]} />
        <meshStandardMaterial color={0xc4ccd1} metalness={0.8} roughness={0.25} />
      </mesh>
      <Line points={[[0, -0.2, -0.091], [0, 0.2, -0.091]]} color={0xe1e7ea} lineWidth={0.6} transparent opacity={0.65} />
    </group>
  );
}

function DebrisModel({ hex }: { hex: number }) {
  return (
    <mesh rotation={[0.45, 0.2, 0.7]}>
      <dodecahedronGeometry args={[0.14, 0]} />
      <meshStandardMaterial color={hex} metalness={0.65} roughness={0.55} flatShading />
    </mesh>
  );
}

function ObjectMarker({ position, direction, hex, type }: {
  position: THREE.Vector3;
  direction: Vec3;
  hex: number;
  type: ConjunctionObject["objectType"];
}) {
  const vector = new THREE.Vector3(direction.x, direction.y, direction.z);
  const quaternion = vector.lengthSq() > 0
    ? new THREE.Quaternion().setFromUnitVectors(FORWARD, vector.normalize())
    : new THREE.Quaternion();

  return (
    <group position={position} quaternion={quaternion}>
      <mesh>
        <sphereGeometry args={[0.23, 20, 20]} />
        <meshBasicMaterial color={hex} transparent opacity={0.045} depthWrite={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.18, 0.195, 32]} />
        <meshBasicMaterial color={hex} transparent opacity={0.32} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {type === "PAYLOAD" ? <PayloadModel hex={hex} /> : null}
      {type === "ROCKET BODY" ? <RocketBodyModel hex={hex} /> : null}
      {type === "DEBRIS" ? <DebrisModel hex={hex} /> : null}
      {type === "UNKNOWN" ? (
        <mesh rotation={[0.35, 0.45, 0]}>
          <octahedronGeometry args={[0.14, 0]} />
          <meshStandardMaterial color={hex} metalness={0.4} roughness={0.5} wireframe />
        </mesh>
      ) : null}
    </group>
  );
}

function EncounterScene({ model, offsetMinutes, risk, objectAType, objectBType }: SceneProps) {
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
  const uncertaintyRadius = model.radialUncertaintyKm ? model.radialUncertaintyKm * scale : null;

  return (
    <group rotation={[0.34, -0.5, 0]}>
      {/* Orientation-only reference plane; computed geometry is never snapped to it. */}
      <gridHelper args={[6, 18, 0x345367, 0x172b38]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.14]} />
      <Line points={[[-3, 0, -0.135], [3, 0, -0.135]]} color={0x54778d} lineWidth={0.8} transparent opacity={0.2} />
      <Line points={[[0, -3, -0.135], [0, 3, -0.135]]} color={0x54778d} lineWidth={0.8} transparent opacity={0.2} />

      {/* Static geometry, framed by the follow-cam group transform. */}
      <group scale={scale} position={groupPosition}>
        <Line points={trackAkm} color={OBJECT_A_HEX} lineWidth={4.5} transparent opacity={0.08} />
        <Line points={trackBkm} color={OBJECT_B_HEX} lineWidth={4.5} transparent opacity={0.08} />
        <Line points={trackAkm} color={OBJECT_A_HEX} lineWidth={1.5} transparent opacity={0.72} />
        <Line points={trackBkm} color={OBJECT_B_HEX} lineWidth={1.5} transparent opacity={0.72} />
        <Line points={[tcaAkm, tcaBkm]} color={riskHex[risk]} lineWidth={2.2} />
        <mesh position={tcaAkm} scale={1 / scale}><sphereGeometry args={[0.035, 12, 12]} /><meshBasicMaterial color={OBJECT_A_HEX} /></mesh>
        <mesh position={tcaBkm} scale={1 / scale}><sphereGeometry args={[0.035, 12, 12]} /><meshBasicMaterial color={OBJECT_B_HEX} /></mesh>
        <group position={tcaMidKm} scale={1 / scale}>
          <mesh><ringGeometry args={[0.09, 0.105, 36]} /><meshBasicMaterial color={riskHex[risk]} transparent opacity={0.78} side={THREE.DoubleSide} /></mesh>
          <mesh><ringGeometry args={[0.17, 0.175, 36]} /><meshBasicMaterial color={riskHex[risk]} transparent opacity={0.22} side={THREE.DoubleSide} /></mesh>
          <Line points={[[-0.24, 0, 0], [-0.12, 0, 0]]} color={riskHex[risk]} lineWidth={1} transparent opacity={0.55} />
          <Line points={[[0.12, 0, 0], [0.24, 0, 0]]} color={riskHex[risk]} lineWidth={1} transparent opacity={0.55} />
          <Line points={[[0, -0.24, 0], [0, -0.12, 0]]} color={riskHex[risk]} lineWidth={1} transparent opacity={0.55} />
          <Line points={[[0, 0.12, 0], [0, 0.24, 0]]} color={riskHex[risk]} lineWidth={1} transparent opacity={0.55} />
        </group>
      </group>

      {/* Object A. */}
      <ObjectMarker position={markerA} direction={model.velocityA} hex={OBJECT_A_HEX} type={objectAType} />
      <VelocityArrow origin={markerA} direction={model.velocityA} hex={OBJECT_A_HEX} />
      {uncertaintyRadius ? (
        <mesh position={markerA}>
          <sphereGeometry args={[uncertaintyRadius, 24, 24]} />
          <meshBasicMaterial color={OBJECT_A_HEX} transparent opacity={0.1} wireframe />
        </mesh>
      ) : null}

      {/* Object B. */}
      <ObjectMarker position={markerB} direction={model.velocityB} hex={OBJECT_B_HEX} type={objectBType} />
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
        <color attach="background" args={["#06090d"]} />
        <fog attach="fog" args={["#06090d", 6.5, 15]} />
        <ambientLight intensity={0.48} />
        <hemisphereLight args={[0x779fc0, 0x080b10, 0.55]} />
        <directionalLight position={[3, 4, 5]} intensity={1.35} color={0xfff0d2} />
        <directionalLight position={[-4, -2, -3]} intensity={0.5} color={0x4b93bf} />
        <pointLight position={[0, 0.5, 2.5]} intensity={0.35} color={0x91c4e5} />
        <Stars radius={42} depth={24} count={650} factor={2} saturation={0.08} fade speed={0} />
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
        drag to orbit · wheel to zoom
      </div>
      <div className="pointer-events-none absolute top-2 left-3 rounded-sm border border-white/10 bg-black/35 px-2 py-1 numeric text-[8.5px] tracking-[0.08em] text-text-tertiary backdrop-blur-sm">
        LOCAL ENCOUNTER FRAME
      </div>
    </div>
  );
}
