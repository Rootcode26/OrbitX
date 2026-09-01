"use client";

import { useEffect, useMemo } from "react";
import * as d3 from "d3";
import * as THREE from "three";
import { feature } from "topojson-client";
import landData from "world-atlas/land-110m.json";
import type { FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import { EARTH_RADIUS_KM } from "@/features/globe/orbit-display-scale";
import type { EncounterEarthContext } from "../encounter-model";

function createEarthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 768;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const ocean = context.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0, "#07111b");
  ocean.addColorStop(0.24, "#0a2639");
  ocean.addColorStop(0.5, "#0b344b");
  ocean.addColorStop(0.76, "#0a2639");
  ocean.addColorStop(1, "#07111b");
  context.fillStyle = ocean;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const topology = landData as unknown as Topology<{ land: GeometryCollection }>;
  const land = feature(topology, topology.objects.land) as unknown as FeatureCollection<Geometry>;
  const projection = d3.geoEquirectangular()
    .translate([canvas.width / 2, canvas.height / 2])
    .scale(canvas.width / (2 * Math.PI));
  const path = d3.geoPath(projection, context);

  // One continuous land surface avoids implying political boundaries. The
  // latitude gradient is purely visual surface styling, not event data.
  context.save();
  context.beginPath();
  path(land);
  context.clip();
  const surface = context.createLinearGradient(0, 0, 0, canvas.height);
  surface.addColorStop(0, "#c3ccca");
  surface.addColorStop(0.09, "#77806c");
  surface.addColorStop(0.24, "#53634b");
  surface.addColorStop(0.42, "#4c6544");
  surface.addColorStop(0.5, "#31563b");
  surface.addColorStop(0.58, "#4c6544");
  surface.addColorStop(0.76, "#53634b");
  surface.addColorStop(0.91, "#77806c");
  surface.addColorStop(1, "#c3ccca");
  context.fillStyle = surface;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();

  context.beginPath();
  path(land);
  context.strokeStyle = "rgba(193,211,200,.38)";
  context.lineWidth = 0.7;
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function createAtmosphereMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDirection;

      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vViewDirection;

      void main() {
        float rim = pow(1.0 - max(dot(vNormal, vViewDirection), 0.0), 3.2);
        gl_FragColor = vec4(0.22, 0.58, 0.82, rim * 0.34);
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
  });
}

function temeToEncounterMatrix(context: EncounterEarthContext) {
  const axes = context.temeAxes;
  return new THREE.Matrix4().set(
    axes.x.x, axes.y.x, axes.z.x, 0,
    axes.x.y, axes.y.y, axes.z.y, 0,
    axes.x.z, axes.y.z, axes.z.z, 0,
    0, 0, 0, 1,
  );
}

function greenwichSiderealRadians(timestampMs: number) {
  const julianDate = timestampMs / 86_400_000 + 2_440_587.5;
  const daysSinceJ2000 = julianDate - 2_451_545;
  const centuries = daysSinceJ2000 / 36_525;
  const degrees = 280.46061837
    + 360.98564736629 * daysSinceJ2000
    + 0.000387933 * centuries * centuries
    - centuries * centuries * centuries / 38_710_000;
  return THREE.MathUtils.degToRad(((degrees % 360) + 360) % 360);
}

export function EncounterEarth({ context, epochMs }: {
  context: EncounterEarthContext;
  epochMs: number;
}) {
  const texture = useMemo(() => createEarthTexture(), []);
  const atmosphereMaterial = useMemo(() => createAtmosphereMaterial(), []);
  const orientation = useMemo(() => temeToEncounterMatrix(context), [context]);
  const siderealRotation = greenwichSiderealRadians(epochMs);

  useEffect(() => () => {
    texture?.dispose();
    atmosphereMaterial.dispose();
  }, [atmosphereMaterial, texture]);

  return (
    <group position={[context.centerKm.x, context.centerKm.y, context.centerKm.z]}>
      <group matrix={orientation} matrixAutoUpdate={false}>
        {/* ECEF +Z is Earth's spin axis; Three's sphere uses local +Y. */}
        <group rotation={[0, 0, siderealRotation]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[EARTH_RADIUS_KM, 72, 48]} />
            <meshStandardMaterial map={texture} color={0xb9c6cb} roughness={0.88} metalness={0} />
          </mesh>
        </group>
        <mesh>
          <sphereGeometry args={[EARTH_RADIUS_KM * 1.012, 72, 48]} />
          <primitive object={atmosphereMaterial} attach="material" />
        </mesh>
      </group>
    </group>
  );
}
