"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import * as THREE from "three";
import { feature } from "topojson-client";
import worldData from "world-atlas/countries-110m.json";
import type { FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { GlobeFilterState, GlobeObject, GlobeSimulationSpeed } from "../types";

interface FlatEarthViewProps {
  active: boolean;
  filters: GlobeFilterState;
  playing: boolean;
  simulationSpeed: GlobeSimulationSpeed;
  visibleObjectIds?: number[];
  selectedObjectId?: number;
  onObjectSelect?: (objectId: number) => void;
  objects?: GlobeObject[];
}

const classColors = {
  active: "#8FAFC4",
  inactive: "#787E85",
  debris: "#7E7B74",
  rocket: "#B2843C",
  focused: "#92B8A2",
};

function isClassVisible(object: GlobeObject, filters: GlobeFilterState) {
  if (object.objectClass === "active" || object.objectClass === "inactive") return filters.satellites;
  if (object.objectClass === "debris") return filters.debris;
  if (object.objectClass === "rocket") return filters.rocketBodies;
  return true;
}

function inertialPosition(object: GlobeObject, phase: number, rotation: THREE.Quaternion, target: THREE.Vector3) {
  const semiMinor = object.orbitRadius * Math.sqrt(1 - object.eccentricity * object.eccentricity);
  return target.set(
    object.orbitRadius * (Math.cos(phase) - object.eccentricity),
    semiMinor * Math.sin(phase),
    0,
  ).applyQuaternion(rotation);
}

function toCoordinates(position: THREE.Vector3): [number, number] {
  const radius = position.length();
  return [
    THREE.MathUtils.radToDeg(Math.atan2(position.z, position.x)),
    THREE.MathUtils.radToDeg(Math.asin(position.y / radius)),
  ];
}

export function FlatEarthView({
  active,
  filters,
  playing,
  simulationSpeed,
  visibleObjectIds,
  selectedObjectId,
  onObjectSelect,
  objects = [],
}: FlatEarthViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phasesRef = useRef(new Float64Array(objects.map((object) => object.phase)));
  const rotationsRef = useRef(objects.map((object) => new THREE.Quaternion().setFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(object.inclination),
    THREE.MathUtils.degToRad(object.raan),
    THREE.MathUtils.degToRad(object.argumentOfPerigee),
    "YXZ",
  ))));
  const screenPositionsRef = useRef(new Map<number, [number, number]>());
  const stateRef = useRef({ filters, playing, simulationSpeed, visibleObjectIds, selectedObjectId, onObjectSelect });

  useEffect(() => {
    stateRef.current = { filters, playing, simulationSpeed, visibleObjectIds, selectedObjectId, onObjectSelect };
  }, [filters, playing, simulationSpeed, visibleObjectIds, selectedObjectId, onObjectSelect]);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const context = canvas.getContext("2d") as CanvasRenderingContext2D;
    phasesRef.current = new Float64Array(objects.map((object) => object.phase));
    rotationsRef.current = objects.map((object) => new THREE.Quaternion().setFromEuler(new THREE.Euler(
      THREE.MathUtils.degToRad(object.inclination),
      THREE.MathUtils.degToRad(object.raan),
      THREE.MathUtils.degToRad(object.argumentOfPerigee),
      "YXZ",
    )));

    const topology = worldData as unknown as Topology<{ countries: GeometryCollection }>;
    const countries = feature(topology, topology.objects.countries) as unknown as FeatureCollection<Geometry>;
    const projection = d3.geoEquirectangular();
    const baseCanvas = document.createElement("canvas");
    const baseContext = baseCanvas.getContext("2d") as CanvasRenderingContext2D;
    let width = 1;
    let height = 1;
    let previousTime = performance.now();
    let smoothedMotionScale = 1;
    let animationFrame = 0;
    const position = new THREE.Vector3();

    function drawBase() {
      const pixelRatio = Math.min(window.devicePixelRatio, 2);
      baseCanvas.width = Math.max(1, Math.floor(width * pixelRatio));
      baseCanvas.height = Math.max(1, Math.floor(height * pixelRatio));
      baseContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      baseContext.fillStyle = "#071018";
      baseContext.fillRect(0, 0, width, height);
      projection.fitExtent([[22, 50], [width - 22, height - 64]], { type: "Sphere" });
      const path = d3.geoPath(projection, baseContext);
      baseContext.beginPath();
      path({ type: "Sphere" });
      const ocean = baseContext.createLinearGradient(0, 50, 0, height - 64);
      ocean.addColorStop(0, "#061523");
      ocean.addColorStop(0.5, "#0A3A5C");
      ocean.addColorStop(1, "#061523");
      baseContext.fillStyle = ocean;
      baseContext.fill();
      baseContext.strokeStyle = "rgba(92,179,220,.34)";
      baseContext.lineWidth = 1;
      baseContext.stroke();
      baseContext.beginPath();
      path(d3.geoGraticule10());
      baseContext.strokeStyle = "rgba(151,190,207,.075)";
      baseContext.lineWidth = 0.7;
      baseContext.stroke();
      countries.features.forEach((country, index) => {
        const latitude = Math.abs(d3.geoCentroid(country)[1]);
        baseContext.beginPath();
        path(country);
        baseContext.fillStyle = latitude > 66
          ? "#BCC7C5"
          : latitude > 48
            ? index % 2 === 0 ? "#53624B" : "#5D684E"
            : latitude < 24
              ? index % 3 === 0 ? "#315D3B" : index % 3 === 1 ? "#3D663F" : "#52643C"
              : index % 3 === 0 ? "#53613B" : index % 3 === 1 ? "#6A6440" : "#465A3A";
        baseContext.fill();
        baseContext.strokeStyle = "rgba(187,211,199,.40)";
        baseContext.lineWidth = 0.55;
        baseContext.stroke();
      });
    }

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const pixelRatio = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      drawBase();
    }

    function drawOrbit(object: GlobeObject, rotation: THREE.Quaternion) {
      let previousX: number | null = null;
      context.beginPath();
      for (let sample = 0; sample <= 160; sample += 1) {
        const coordinates = toCoordinates(inertialPosition(object, sample / 160 * Math.PI * 2, rotation, position));
        const projected = projection(coordinates);
        if (!projected) continue;
        if (previousX === null || Math.abs(projected[0] - previousX) > width * 0.45) context.moveTo(projected[0], projected[1]);
        else context.lineTo(projected[0], projected[1]);
        previousX = projected[0];
      }
      context.strokeStyle = classColors[object.objectClass];
      context.globalAlpha = 0.34;
      context.lineWidth = 0.8;
      context.stroke();
      context.globalAlpha = 1;
    }

    function draw(time: number) {
      animationFrame = window.requestAnimationFrame(draw);
      if (!active) {
        previousTime = time;
        return;
      }
      const delta = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      const state = stateRef.current;
      const targetMotionScale = state.playing ? state.simulationSpeed : 0;
      smoothedMotionScale = THREE.MathUtils.damp(smoothedMotionScale, targetMotionScale, 5.5, delta);
      if (Math.abs(smoothedMotionScale - targetMotionScale) < 0.0005) smoothedMotionScale = targetMotionScale;
      const simulationDelta = delta * smoothedMotionScale;
      const visibleIds = state.visibleObjectIds ? new Set(state.visibleObjectIds) : null;
      const pixelRatio = Math.min(window.devicePixelRatio, 2);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.drawImage(baseCanvas, 0, 0, width, height);

      if (state.filters.orbits) {
        const orbitIds = visibleIds ?? new Set(objects.map((object) => object.id));
        if (state.selectedObjectId !== undefined) orbitIds.add(state.selectedObjectId);
        objects.forEach((object, index) => {
          if (orbitIds.has(object.id) && isClassVisible(object, state.filters)) drawOrbit(object, rotationsRef.current[index]);
        });
      }

      screenPositionsRef.current.clear();
      objects.forEach((object, index) => {
        phasesRef.current[index] = (phasesRef.current[index] + object.angularSpeed * simulationDelta) % (Math.PI * 2);
        if (!isClassVisible(object, state.filters) || (visibleIds && !visibleIds.has(object.id))) return;
        const coordinates = toCoordinates(inertialPosition(object, phasesRef.current[index], rotationsRef.current[index], position));
        const projected = projection(coordinates);
        if (!projected) return;
        const selected = object.id === state.selectedObjectId;
        context.fillStyle = selected ? "#FFFFFF" : classColors[object.objectClass];
        context.globalAlpha = 0.95;
        context.beginPath();
        context.arc(projected[0], projected[1], selected ? 6.8 : 5.2, 0, Math.PI * 2);
        context.fill();
        screenPositionsRef.current.set(object.id, projected);
      });
      context.globalAlpha = 1;

      if (state.filters.labels) {
        context.font = "500 9px Inter, sans-serif";
        screenPositionsRef.current.forEach(([x, y], objectId) => {
          const object = objects.find(({ id }) => id === objectId);
          if (object) {
            context.fillStyle = classColors[object.objectClass];
            context.fillText(object.name, x + 6, y - 5);
          }
        });
      }
    }

    function selectObject(event: MouseEvent) {
      const bounds = canvas.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      let nearestId: number | undefined;
      let nearestDistance = 12;
      screenPositionsRef.current.forEach(([objectX, objectY], objectId) => {
        const distance = Math.hypot(objectX - x, objectY - y);
        if (distance < nearestDistance) {
          nearestId = objectId;
          nearestDistance = distance;
        }
      });
      if (nearestId !== undefined) stateRef.current.onObjectSelect?.(nearestId);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("click", selectObject);
    resize();
    animationFrame = window.requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      canvas.removeEventListener("click", selectObject);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [active, objects]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-crosshair" />;
}
