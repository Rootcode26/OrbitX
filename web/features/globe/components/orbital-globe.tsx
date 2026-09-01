"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as d3 from "d3";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { feature } from "topojson-client";
import worldData from "world-atlas/countries-110m.json";
import type { FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import { Icon } from "@/components/ui/icon";
import { useGlobeObjects } from "../hooks/use-globe-objects";
import {
  MARKER_BASE_SCALE,
  SELECTED_MARKER_SCALE,
  medianRadarCrossSection,
  radarCrossSectionMarkerScale,
} from "../marker-display-scale";
import { expandOrbitRadius } from "../orbit-display-scale";
import type {
  GlobeFilter,
  GlobeFilterState,
  GlobeObject,
  GlobeObjectClass,
  OrbitalGlobeProps,
  GlobeSimulationSpeed,
  GlobeViewMode,
} from "../types";
import { FlatEarthView } from "./flat-earth-view";

interface AnimatedGlobeObject {
  object: GlobeObject;
  phase: number;
  marker: THREE.Mesh;
  label: THREE.Sprite | null;
}

const objectColors: Record<GlobeObjectClass, number> = {
  active: 0x8fafc4,
  inactive: 0x787e85,
  debris: 0x7e7b74,
  rocket: 0xb2843c,
  focused: 0x92b8a2,
};

const orbitColors: Record<GlobeObjectClass, number> = {
  active: 0x7198ad,
  inactive: 0x6d7478,
  debris: 0x77736c,
  rocket: 0xa47738,
  focused: 0x79aa8e,
};

const labelColors: Record<GlobeObjectClass, string> = {
  active: "#A9C8DA",
  inactive: "#92999F",
  debris: "#96928A",
  rocket: "#C79A51",
  focused: "#A9CCB8",
};

// Every object renders as a point/marker, but full orbit rings are drawn only
// for the first few — hundreds of orbit tubes would be slow and unreadable.
const ORBIT_LIMIT = 14;

// Real-time-accurate motion: satellite mean motion and Earth rotation are both
// driven by their true periods, expressed in simulated seconds. This factor
// accelerates the simulated clock so the mechanics are watchable — at 1×
// playback a ~90 min LEO orbit takes ~90 s, GEO barely moves, and one Earth
// rotation takes ~24 min — all in correct proportion.
const TIME_ACCELERATION = 60;
const EARTH_ANGULAR_RATE = (2 * Math.PI) / 86_400; // rad per simulated second

function SpaceBackdrop({ compact }: { compact: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 18% 26%, rgba(26,71,102,.18), transparent 28%), radial-gradient(circle at 82% 72%, rgba(71,54,89,.12), transparent 32%), radial-gradient(circle at 54% 46%, rgba(18,41,58,.10), transparent 45%)",
        }}
      />
      <Canvas
        camera={{ position: [0, 0, 1], fov: 72 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
      >
        <Stars
          radius={72}
          depth={38}
          count={compact ? 1200 : 2200}
          factor={2.1}
          saturation={0.08}
          fade
          speed={0.2}
        />
      </Canvas>
    </div>
  );
}

function createEarthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  const topology = worldData as unknown as Topology<{ countries: GeometryCollection }>;
  const countries = feature(topology, topology.objects.countries) as unknown as FeatureCollection<Geometry>;
  const projection = d3.geoEquirectangular().fitExtent([[0, 0], [canvas.width, canvas.height]], { type: "Sphere" });
  const path = d3.geoPath(projection, context);

  const ocean = context.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0, "#061523");
  ocean.addColorStop(0.18, "#092B45");
  ocean.addColorStop(0.5, "#0A3A5C");
  ocean.addColorStop(0.82, "#092B45");
  ocean.addColorStop(1, "#061523");
  context.fillStyle = ocean;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 900; index += 1) {
    const x = seededRandom(index * 2 + 41) * canvas.width;
    const y = seededRandom(index * 2 + 42) * canvas.height;
    const opacity = 0.008 + seededRandom(index + 90) * 0.016;
    context.fillStyle = `rgba(132,190,216,${opacity})`;
    context.fillRect(x, y, 1, 1);
  }

  context.beginPath();
  path(d3.geoGraticule10());
  context.strokeStyle = "rgba(151,190,207,.075)";
  context.lineWidth = 1;
  context.stroke();

  countries.features.forEach((country, index) => {
    const latitude = Math.abs(d3.geoCentroid(country)[1]);
    context.beginPath();
    path(country);
    context.fillStyle = latitude > 66
      ? "#BCC7C5"
      : latitude > 48
        ? index % 2 === 0 ? "#53624B" : "#5D684E"
        : latitude < 24
          ? index % 3 === 0 ? "#315D3B" : index % 3 === 1 ? "#3D663F" : "#52643C"
          : index % 3 === 0 ? "#53613B" : index % 3 === 1 ? "#6A6440" : "#465A3A";
    context.fill();
    context.strokeStyle = "rgba(174,194,172,.24)";
    context.lineWidth = 0.55;
    context.stroke();
  });

  context.beginPath();
  path(countries);
  context.strokeStyle = "rgba(187,211,199,.52)";
  context.lineWidth = 0.8;
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createCloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.filter = "blur(9px)";
  for (let index = 0; index < 150; index += 1) {
    const x = seededRandom(index * 5 + 201) * canvas.width;
    const y = seededRandom(index * 5 + 202) * canvas.height;
    const width = 20 + seededRandom(index * 5 + 203) * 95;
    const height = 3 + seededRandom(index * 5 + 204) * 13;
    const opacity = 0.035 + seededRandom(index * 5 + 205) * 0.08;
    context.beginPath();
    context.ellipse(x, y, width, height, seededRandom(index + 400) * 0.5 - 0.25, 0, Math.PI * 2);
    context.fillStyle = `rgba(207,220,228,${opacity})`;
    context.fill();
  }
  context.filter = "none";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createAtmosphereMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewPosition = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        float rim = pow(1.0 - max(dot(vNormal, vViewPosition), 0.0), 2.4);
        gl_FragColor = vec4(0.20, 0.64, 0.92, rim * 0.40);
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
  });
}

function createLabel(name: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.font = "500 18px Inter, sans-serif";
  context.fillStyle = color;
  context.textAlign = "center";
  context.fillText(name, 256, 40);
  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.42, 0.17, 1);
  return sprite;
}

function orbitPosition(object: GlobeObject, angle: number) {
  const semiMinor = object.orbitRadius * Math.sqrt(1 - object.eccentricity * object.eccentricity);
  return new THREE.Vector3(
    object.orbitRadius * (Math.cos(angle) - object.eccentricity),
    semiMinor * Math.sin(angle),
    0,
  );
}

function orientOrbitalPlane(group: THREE.Group, object: GlobeObject) {
  group.rotation.order = "YXZ";
  group.rotation.set(
    THREE.MathUtils.degToRad(object.inclination),
    THREE.MathUtils.degToRad(object.raan),
    THREE.MathUtils.degToRad(object.argumentOfPerigee),
  );
}

function createOrbit(object: GlobeObject, color: number) {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index < 192; index += 1) {
    const angle = (index / 192) * Math.PI * 2;
    points.push(orbitPosition(object, angle));
  }
  const curve = new THREE.CatmullRomCurve3(points, true, "centripetal");
  const orbit = new THREE.Group();

  const glow = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 256, 0.013, 4, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.userData.orbitLayer = "glow";
  glow.userData.baseColor = color;
  glow.userData.baseOpacity = 0.1;

  const core = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 256, 0.0045, 4, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    }),
  );
  core.userData.orbitLayer = "core";
  core.userData.baseColor = color;
  core.userData.baseOpacity = 0.58;
  orbit.add(glow, core);

  const orbitalPlane = new THREE.Group();
  orbitalPlane.userData.objectId = object.id;
  orbitalPlane.userData.objectClass = object.objectClass;
  orientOrbitalPlane(orbitalPlane, object);
  orbitalPlane.add(orbit);
  return orbitalPlane;
}

function seededRandom(seed: number) {
  const value = Math.sin(seed * 999.91) * 43758.5453;
  return value - Math.floor(value);
}

function objectClassVisible(objectClass: GlobeObjectClass, filters: GlobeFilterState) {
  if (objectClass === "focused") return true;
  if (objectClass === "active" || objectClass === "inactive") return filters.satellites;
  if (objectClass === "debris") return filters.debris;
  return filters.rocketBodies;
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
      object.geometry?.dispose();
      const material = object.material;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose();
    }
  });
}

export function OrbitalGlobe({
  altitudeDisplayScale = "expanded",
  compact = false,
  finder = false,
  featuredObject,
  tracking = false,
  visibleObjectIds,
  selectedObjectId,
  onObjectSelect,
  objects: baseObjects = [],
}: OrbitalGlobeProps = {}) {
  const preserveMakerScale = altitudeDisplayScale === "unchanged";
  const { objects: sourceObjects, userObjectIds } = useGlobeObjects(
    baseObjects,
    featuredObject?.id,
    preserveMakerScale,
  );
  const objects = useMemo(
    () => preserveMakerScale
      ? sourceObjects
      : sourceObjects.map((object) => ({ ...object, orbitRadius: expandOrbitRadius(object.orbitRadius) })),
    [preserveMakerScale, sourceObjects],
  );
  const effectiveVisibleObjectIds = useMemo(
    () => visibleObjectIds ? Array.from(new Set([...visibleObjectIds, ...userObjectIds])) : undefined,
    [visibleObjectIds, userObjectIds],
  );
  const medianRcsM2 = useMemo(() => medianRadarCrossSection(objects), [objects]);
  const defaultCameraZ = compact ? 5.35 : finder ? 5.9 : 6.15;
  const mountRef = useRef<HTMLDivElement>(null);
  const orbitGroupRef = useRef<THREE.Group | null>(null);
  const labelGroupRef = useRef<THREE.Group | null>(null);
  const objectGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraGoalRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const targetFovRef = useRef(30);
  const playingRef = useRef(true);
  const simulationSpeedRef = useRef<GlobeSimulationSpeed>(1);
  const featuredObjectRef = useRef<AnimatedGlobeObject | null>(null);
  const onObjectSelectRef = useRef(onObjectSelect);
  const filtersRef = useRef<GlobeFilterState>({
    satellites: true,
    debris: true,
    rocketBodies: true,
    orbits: true,
    labels: false,
  });
  const visibleObjectIdsRef = useRef<Set<number> | null>(effectiveVisibleObjectIds ? new Set(effectiveVisibleObjectIds) : null);
  const selectedObjectIdRef = useRef(selectedObjectId);
  const [viewMode, setViewMode] = useState<GlobeViewMode>("3D");
  const [playing, setPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState<GlobeSimulationSpeed>(1);
  const [filters, setFilters] = useState<GlobeFilterState>({
    satellites: true,
    debris: true,
    rocketBodies: true,
    orbits: true,
    labels: false,
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.08, defaultCameraZ);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a09, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.enablePan = false;
    controls.minDistance = 3.45;
    controls.maxDistance = 8.6;
    controls.rotateSpeed = 0.36;
    controls.zoomSpeed = 0.46;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.22;
    controlsRef.current = controls;
    const cancelCameraTransition = () => {
      cameraGoalRef.current = null;
    };
    controls.addEventListener("start", cancelCameraTransition);

    const hemisphereLight = new THREE.HemisphereLight(0xa8cfe3, 0x07101a, 0.74);
    const keyLight = new THREE.DirectionalLight(0xfff1d8, 1.3);
    const fillLight = new THREE.DirectionalLight(0x3e7fa4, 0.42);
    keyLight.position.set(-3.5, 2.5, 4.5);
    fillLight.position.set(4, -2, -3);
    scene.add(hemisphereLight, keyLight, fillLight);

    const system = new THREE.Group();
    system.rotation.set(0.1, -0.35, 0);
    scene.add(system);

    const earthTexture = createEarthTexture();
    if (earthTexture) {
      earthTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    }
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 96),
      new THREE.MeshStandardMaterial({
        map: earthTexture,
        color: 0xffffff,
        emissive: 0x03101a,
        emissiveIntensity: 0.2,
        roughness: 0.74,
        metalness: 0.04,
      }),
    );
    system.add(earth);

    const cloudTexture = createCloudTexture();
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.008, 96, 96),
      new THREE.MeshPhongMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      }),
    );
    system.add(clouds);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.055, 96, 96),
      createAtmosphereMaterial(),
    );
    system.add(atmosphere);

    const atmosphereEdge = new THREE.Mesh(
      new THREE.SphereGeometry(1.012, 96, 96),
      new THREE.MeshBasicMaterial({
        color: 0x4eb8e8,
        transparent: true,
        opacity: 0.055,
        side: THREE.FrontSide,
        depthWrite: false,
      }),
    );
    system.add(atmosphereEdge);

    const orbitGroup = new THREE.Group();
    const objectGroup = new THREE.Group();
    const labelGroup = new THREE.Group();
    orbitGroupRef.current = orbitGroup;
    objectGroupRef.current = objectGroup;
    labelGroupRef.current = labelGroup;
    system.add(orbitGroup, objectGroup, labelGroup);

    const pointPositions = new Float32Array(objects.length * 3);
    const pointColors = new Float32Array(objects.length * 3);
    const catalogPhases = new Float32Array(objects.map((object) => object.phase));
    const catalogRotations = objects.map((object) => new THREE.Quaternion().setFromEuler(new THREE.Euler(
      THREE.MathUtils.degToRad(object.inclination),
      THREE.MathUtils.degToRad(object.raan),
      THREE.MathUtils.degToRad(object.argumentOfPerigee),
      "YXZ",
    )));
    const workingPosition = new THREE.Vector3();
    const workingColor = new THREE.Color();

    objects.forEach((object, index) => {
      const position = orbitPosition(object, object.phase).applyQuaternion(catalogRotations[index]);
      position.toArray(pointPositions, index * 3);
      workingColor.setHex(objectColors[object.objectClass]);
      workingColor.toArray(pointColors, index * 3);
    });

    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));
    pointGeometry.setAttribute("color", new THREE.BufferAttribute(pointColors, 3));
    const pointCloud = new THREE.Points(
      pointGeometry,
      new THREE.PointsMaterial({
        size: 0.075 * MARKER_BASE_SCALE,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      }),
    );
    pointCloud.userData.catalogPoints = true;
    system.add(pointCloud);

    const animatedObjects: AnimatedGlobeObject[] = [];
    const userObjectIdSet = new Set(userObjectIds);

    objects.forEach((object, index) => {
      if (index < ORBIT_LIMIT) {
        const orbitColor = orbitColors[object.objectClass];
        const orbitPlane = createOrbit(object, orbitColor);
        orbitPlane.userData.objectId = object.id;
        orbitPlane.userData.objectClass = object.objectClass;
        orbitGroup.add(orbitPlane);
      }

      const position = orbitPosition(object, object.phase);
      const baseMarkerScale = radarCrossSectionMarkerScale(object.radarCrossSectionM2, medianRcsM2);
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(
          (object.objectClass === "active" ? 0.048 : 0.042) * MARKER_BASE_SCALE,
          12,
          12,
        ),
        new THREE.MeshBasicMaterial({
          color: objectColors[object.objectClass],
          transparent: true,
          opacity: 0.96,
          depthWrite: false,
        }),
      );
      marker.position.copy(position);
      marker.userData.objectId = object.id;
      marker.userData.originalColor = objectColors[object.objectClass];
      marker.userData.baseMarkerScale = baseMarkerScale;
      marker.userData.targetScale = baseMarkerScale;
      marker.scale.setScalar(baseMarkerScale);
      const markerPlane = new THREE.Group();
      markerPlane.userData.objectClass = object.objectClass;
      markerPlane.userData.objectId = object.id;
      orientOrbitalPlane(markerPlane, object);
      markerPlane.add(marker);
      objectGroup.add(markerPlane);

      let label: THREE.Sprite | null = null;
      if (index < 10 || object.objectClass === "focused" || userObjectIdSet.has(object.id)) {
        label = createLabel(object.name, labelColors[object.objectClass]);
        if (label) {
          label.position.copy(position).multiplyScalar(1.08);
          const labelPlane = new THREE.Group();
          labelPlane.userData.objectClass = object.objectClass;
          labelPlane.userData.objectId = object.id;
          orientOrbitalPlane(labelPlane, object);
          labelPlane.add(label);
          labelGroup.add(labelPlane);
        }
      }

      animatedObjects.push({ object, phase: object.phase, marker, label });
    });

    let pointerX = 0;
    let pointerY = 0;
    let pointerTravel = 0;
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0.06 };
    const pointer = new THREE.Vector2();
    const onPointerDown = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerTravel = 0;
    };
    const onPointerMove = (event: PointerEvent) => {
      const movementX = event.clientX - pointerX;
      const movementY = event.clientY - pointerY;
      pointerTravel += Math.hypot(movementX, movementY);
      pointerX = event.clientX;
      pointerY = event.clientY;
    };
    const onPointerUp = (event: PointerEvent) => {
      if (pointerTravel < 5 && onObjectSelectRef.current) {
        const bounds = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const intersections = raycaster.intersectObjects([earth, pointCloud, objectGroup], true);
        const markerIndex = intersections.findIndex((intersection) => {
          if (typeof intersection.object.userData.objectId === "number") return true;
          return intersection.object === pointCloud && typeof intersection.index === "number" && intersection.index < objects.length;
        });
        const earthIndex = intersections.findIndex((intersection) => intersection.object === earth);
        if (markerIndex >= 0 && (earthIndex < 0 || markerIndex < earthIndex)) {
          const intersection = intersections[markerIndex];
          const objectId = intersection.object === pointCloud && typeof intersection.index === "number"
            ? objects[intersection.index].id
            : intersection.object.userData.objectId as number;
          onObjectSelectRef.current(objectId);
        }
      }
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const timer = new THREE.Timer();
    const orbitTargetColor = new THREE.Color();
    const markerTargetColor = new THREE.Color();
    let smoothedMotionScale = 1;
    let animationFrame = 0;
    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      timer.update();
      const delta = Math.min(timer.getDelta(), 0.05);
      const fovDamping = 1 - Math.exp(-9 * delta);
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFovRef.current, fovDamping);
      camera.updateProjectionMatrix();

      const targetMotionScale = playingRef.current ? simulationSpeedRef.current : 0;
      smoothedMotionScale = THREE.MathUtils.damp(smoothedMotionScale, targetMotionScale, 5.5, delta);
      if (Math.abs(smoothedMotionScale - targetMotionScale) < 0.0005) smoothedMotionScale = targetMotionScale;
      const simulationDelta = delta * smoothedMotionScale;
      // Simulated seconds elapsed this frame — drives orbital motion and Earth
      // spin at their true rates (camera auto-rotate stays on the raw scale).
      const orbitalDelta = simulationDelta * TIME_ACCELERATION;

      controls.autoRotateSpeed = THREE.MathUtils.damp(
        controls.autoRotateSpeed,
        0.22 * smoothedMotionScale,
        4.5,
        delta,
      );
      const cameraGoal = cameraGoalRef.current;
      controls.autoRotate = cameraGoal === null;
      if (cameraGoal) {
        const cameraDamping = 1 - Math.exp(-7 * delta);
        camera.position.lerp(cameraGoal.position, cameraDamping);
        controls.target.lerp(cameraGoal.target, cameraDamping);

        if (camera.position.distanceToSquared(cameraGoal.position) < 0.00002 && controls.target.distanceToSquared(cameraGoal.target) < 0.00002) {
          camera.position.copy(cameraGoal.position);
          controls.target.copy(cameraGoal.target);
          cameraGoalRef.current = null;
          controls.autoRotate = true;
        }
      }
      controls.update(delta);

      const visibleIds = visibleObjectIdsRef.current;
      objects.forEach((object, index) => {
        catalogPhases[index] = (catalogPhases[index] + object.angularSpeed * orbitalDelta) % (Math.PI * 2);
        const isVisible = objectClassVisible(object.objectClass, filtersRef.current) && (!visibleIds || visibleIds.has(object.id));
        if (isVisible) {
          const semiMinor = object.orbitRadius * Math.sqrt(1 - object.eccentricity * object.eccentricity);
          workingPosition.set(
            object.orbitRadius * (Math.cos(catalogPhases[index]) - object.eccentricity),
            semiMinor * Math.sin(catalogPhases[index]),
            0,
          ).applyQuaternion(catalogRotations[index]).toArray(pointPositions, index * 3);
        } else {
          workingPosition.set(1000, 1000, 1000).toArray(pointPositions, index * 3);
        }
        workingColor.setHex(object.id === selectedObjectIdRef.current ? 0xffffff : objectColors[object.objectClass]);
        workingColor.toArray(pointColors, index * 3);
      });
      (pointGeometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      (pointGeometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;

      if (simulationDelta > 0) {
        const movingObjects = featuredObjectRef.current
          ? [...animatedObjects, featuredObjectRef.current]
          : animatedObjects;
        movingObjects.forEach((animatedObject) => {
          animatedObject.phase = (animatedObject.phase + animatedObject.object.angularSpeed * orbitalDelta) % (Math.PI * 2);
          const position = orbitPosition(animatedObject.object, animatedObject.phase);
          animatedObject.marker.position.copy(position);
          animatedObject.label?.position.copy(position).multiplyScalar(1.08);
        });
      }

      objectGroup.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || typeof object.userData.targetScale !== "number") return;
        const material = object.material;
        if (!(material instanceof THREE.MeshBasicMaterial)) return;
        const nextScale = THREE.MathUtils.damp(object.scale.x, object.userData.targetScale as number, 9, delta);
        object.scale.setScalar(nextScale);
        markerTargetColor.setHex(object.userData.targetColor as number);
        material.color.lerp(markerTargetColor, 1 - Math.exp(-9 * delta));
      });

      orbitGroup.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || typeof object.userData.targetOpacity !== "number") return;
        const material = object.material;
        if (!(material instanceof THREE.MeshBasicMaterial)) return;
        material.opacity = THREE.MathUtils.damp(material.opacity, object.userData.targetOpacity as number, 8, delta);
        orbitTargetColor.setHex(object.userData.targetColor as number);
        material.color.lerp(orbitTargetColor, 1 - Math.exp(-8 * delta));
      });

      earth.rotation.y += orbitalDelta * EARTH_ANGULAR_RATE;
      clouds.rotation.y = earth.rotation.y * 1.14;
      atmosphereEdge.rotation.y = earth.rotation.y * 0.82;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.removeEventListener("start", cancelCameraTransition);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points || object instanceof THREE.Sprite) {
          object.geometry?.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material?.dispose();
        }
      });
      earthTexture?.dispose();
      cloudTexture?.dispose();
      controlsRef.current = null;
      cameraRef.current = null;
      cameraGoalRef.current = null;
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [defaultCameraZ, medianRcsM2, objects, userObjectIds]);

  useEffect(() => {
    const orbitGroup = orbitGroupRef.current;
    const objectGroup = objectGroupRef.current;
    const labelGroup = labelGroupRef.current;
    if (!featuredObject || !orbitGroup || !objectGroup || !labelGroup) return;

    const orbitPlane = createOrbit(featuredObject, 0x658f78);
    const markerPlane = new THREE.Group();
    const labelPlane = new THREE.Group();
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.054 * MARKER_BASE_SCALE, 14, 14),
      new THREE.MeshBasicMaterial({ color: objectColors.focused }),
    );
    const label = createLabel(featuredObject.name, labelColors.focused);
    const position = orbitPosition(featuredObject, featuredObject.phase);

    marker.position.copy(position);
    marker.userData.objectId = featuredObject.id;
    marker.userData.originalColor = objectColors.focused;
    marker.userData.baseMarkerScale = 1;
    marker.userData.targetScale = 1;
    markerPlane.userData.objectClass = "focused";
    orientOrbitalPlane(markerPlane, featuredObject);
    markerPlane.add(marker);

    if (label) {
      label.position.copy(position).multiplyScalar(1.08);
      labelPlane.userData.objectClass = "focused";
      orientOrbitalPlane(labelPlane, featuredObject);
      labelPlane.add(label);
    }

    orbitGroup.add(orbitPlane);
    objectGroup.add(markerPlane);
    if (label) labelGroup.add(labelPlane);
    featuredObjectRef.current = {
      object: featuredObject,
      phase: featuredObject.phase,
      marker,
      label,
    };

    return () => {
      orbitGroup.remove(orbitPlane);
      objectGroup.remove(markerPlane);
      if (label) labelGroup.remove(labelPlane);
      disposeObject(orbitPlane);
      disposeObject(markerPlane);
      if (label) disposeObject(labelPlane);
      featuredObjectRef.current = null;
    };
  }, [featuredObject]);

  useEffect(() => {
    const visibleIds = effectiveVisibleObjectIds ? new Set(effectiveVisibleObjectIds) : null;
    const orbitIds = visibleIds ? new Set(visibleIds) : new Set(objects.map((object) => object.id));
    if (selectedObjectId !== undefined) orbitIds.add(selectedObjectId);
    filtersRef.current = filters;
    visibleObjectIdsRef.current = visibleIds;
    if (orbitGroupRef.current) {
      orbitGroupRef.current.visible = filters.orbits;
      orbitGroupRef.current.children.forEach((child) => {
        const objectId = child.userData.objectId as number | undefined;
        const objectClass = child.userData.objectClass as GlobeObjectClass | undefined;
        child.visible = objectId === undefined || (orbitIds.has(objectId) && (!objectClass || objectClassVisible(objectClass, filters)));
      });
    }
    if (labelGroupRef.current) {
      labelGroupRef.current.visible = filters.labels;
      labelGroupRef.current.children.forEach((child) => {
        const objectClass = child.userData.objectClass as GlobeObjectClass;
        const objectId = child.userData.objectId as number | undefined;
        child.visible = objectClassVisible(objectClass, filters) && (!visibleIds || objectId === undefined || visibleIds.has(objectId));
      });
    }
    objectGroupRef.current?.children.forEach((child) => {
      const objectClass = child.userData.objectClass as GlobeObjectClass;
      const objectId = child.userData.objectId as number | undefined;
      child.visible = objectClassVisible(objectClass, filters) && (!visibleIds || objectId === undefined || visibleIds.has(objectId));
    });
  }, [filters, effectiveVisibleObjectIds, featuredObject, selectedObjectId, objects]);

  useEffect(() => {
    targetFovRef.current = viewMode === "3D" ? 30 : 24;
  }, [viewMode]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    simulationSpeedRef.current = simulationSpeed;
  }, [simulationSpeed]);

  useEffect(() => {
    onObjectSelectRef.current = onObjectSelect;
  }, [onObjectSelect]);

  useEffect(() => {
    selectedObjectIdRef.current = selectedObjectId;
    objectGroupRef.current?.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || typeof object.userData.objectId !== "number") return;
      const material = object.material;
      if (!(material instanceof THREE.MeshBasicMaterial)) return;
      const selected = object.userData.objectId === selectedObjectId;
      object.userData.targetColor = selected ? 0xffffff : object.userData.originalColor as number;
      const baseMarkerScale = typeof object.userData.baseMarkerScale === "number"
        ? object.userData.baseMarkerScale
        : 1;
      object.userData.targetScale = baseMarkerScale * (selected ? SELECTED_MARKER_SCALE : 1);
    });
    orbitGroupRef.current?.children.forEach((orbitPlane) => {
      const selected = orbitPlane.userData.objectId === selectedObjectId;
      orbitPlane.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !object.userData.orbitLayer) return;
        const material = object.material;
        if (!(material instanceof THREE.MeshBasicMaterial)) return;
        object.userData.targetColor = selected ? 0xdcecf3 : object.userData.baseColor as number;
        object.userData.targetOpacity = selected
          ? object.userData.orbitLayer === "core" ? 0.92 : 0.24
          : object.userData.baseOpacity as number;
      });
    });
  }, [selectedObjectId, featuredObject]);

  function toggleFilter(filter: GlobeFilter) {
    setFilters((current) => ({ ...current, [filter]: !current[filter] }));
  }

  function zoom(delta: number) {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const currentGoal = cameraGoalRef.current;
    const target = currentGoal?.target.clone() ?? controls.target.clone();
    const offset = (currentGoal?.position.clone() ?? camera.position.clone()).sub(target);
    const nextDistance = THREE.MathUtils.clamp(offset.length() + delta, controls.minDistance, controls.maxDistance);
    cameraGoalRef.current = {
      position: target.clone().add(offset.normalize().multiplyScalar(nextDistance)),
      target,
    };
  }

  function centerGlobe() {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    cameraGoalRef.current = {
      position: new THREE.Vector3(0, 0.08, defaultCameraZ),
      target: new THREE.Vector3(0, 0, 0),
    };
  }

  const filterControls: [GlobeFilter, string][] = compact
    ? [["orbits", "ORBITS"], ["labels", "LABELS"]]
    : [
        ["satellites", "SATS"],
        ["debris", "DEBRIS"],
        ["rocketBodies", "R/B"],
        ["orbits", "ORBITS"],
        ["labels", "LABELS"],
      ];

  return (
    <div className={`relative overflow-hidden bg-well ${compact ? "h-[360px]" : finder ? "h-[440px] min-[1500px]:h-[480px]" : tracking ? "h-[calc(100vh-100px)] min-h-[620px]" : "h-[510px] min-[1500px]:h-[570px]"}`}>
      <div className={`absolute inset-0 transition-opacity duration-500 ease-out ${viewMode === "3D" ? "opacity-100" : "opacity-0"}`}>
        <SpaceBackdrop compact={compact} />
      </div>
      <div ref={mountRef} className={`absolute inset-0 cursor-grab transition-opacity duration-300 ease-out active:cursor-grabbing ${viewMode === "3D" ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`} />
      <div className={`absolute inset-0 transition-opacity duration-300 ease-out ${viewMode === "2D" ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
        <FlatEarthView
          active={viewMode === "2D"}
          filters={filters}
          playing={playing}
          simulationSpeed={simulationSpeed}
          visibleObjectIds={effectiveVisibleObjectIds}
          selectedObjectId={selectedObjectId}
          onObjectSelect={onObjectSelect}
          objects={objects}
        />
      </div>

      <div className="absolute top-3 left-3 flex border border-[var(--bd)] bg-[rgba(10,10,9,.9)]">
        {(["3D", "2D"] as GlobeViewMode[]).map((mode) => (
          <button key={mode} onClick={() => setViewMode(mode)} className={`numeric h-7 min-w-10 px-3 text-[9px] font-semibold transition-colors duration-120 ${viewMode === mode ? "bg-[var(--acc-tint)] text-[var(--acc-text)]" : "text-text-tertiary hover:text-text-primary"}`}>
            {mode}
          </button>
        ))}
      </div>

      <div className="absolute top-3 right-3 flex gap-1">
        {filterControls.map(([filter, label]) => (
          <button key={filter} onClick={() => toggleFilter(filter)} className={`numeric h-7 border px-2.5 text-[9px] font-semibold tracking-[0.07em] transition-colors duration-120 ${filters[filter] ? "border-[var(--acc-border)] bg-[var(--acc-tint)] text-[var(--acc-text)]" : "border-[var(--bd)] bg-[rgba(10,10,9,.86)] text-text-tertiary"}`}>
            {label}
          </button>
        ))}
      </div>

      {viewMode === "3D" ? <div className="absolute top-[58px] left-3 grid gap-1.5">
        <button aria-label="Zoom in" onClick={() => zoom(-0.45)} className="flex h-7 w-7 items-center justify-center border border-[var(--bd)] bg-[rgba(10,10,9,.88)] text-text-secondary transition-colors duration-140 hover:border-[var(--acc-border)] hover:text-text-primary"><Icon name="plus" className="h-3.5 w-3.5" /></button>
        <button aria-label="Zoom out" onClick={() => zoom(0.45)} className="flex h-7 w-7 items-center justify-center border border-[var(--bd)] bg-[rgba(10,10,9,.88)] text-text-secondary transition-colors duration-140 hover:border-[var(--acc-border)] hover:text-text-primary"><Icon name="minus" className="h-3.5 w-3.5" /></button>
        <button aria-label="Center globe" onClick={centerGlobe} className="flex h-7 w-7 items-center justify-center border border-[var(--bd)] bg-[rgba(10,10,9,.88)] text-text-secondary transition-colors duration-140 hover:text-text-primary"><Icon name="target" className="h-3.5 w-3.5" /></button>
      </div> : null}

      {!compact ? <div className="absolute bottom-[58px] left-3 border border-[var(--bd)] bg-[rgba(10,10,9,.9)] px-3 py-2">
        <div className="numeric grid grid-cols-2 gap-x-3 gap-y-1 text-[8px] text-text-tertiary">
          <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 bg-[var(--object-active)]" />ACTIVE PAYLOAD</span>
          <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 bg-[var(--object-inactive)]" />INACTIVE</span>
          <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 bg-[var(--object-rocket)]" />ROCKET BODY</span>
          <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 bg-[var(--object-debris)]" />DEBRIS</span>
        </div>
        <div className="mt-1.5 max-w-52 text-[7.5px] leading-tight text-text-tertiary">
          Marker size uses SATCAT RCS when available · not physically to scale
        </div>
      </div> : null}

      <div className="absolute right-3 bottom-3 left-3 flex h-10 items-center border border-[var(--bd)] bg-[rgba(10,10,9,.92)] px-3">
        <button aria-label={playing ? "Pause timeline" : "Play timeline"} onClick={() => setPlaying((value) => !value)} className="flex h-7 w-7 items-center justify-center border border-[var(--acc-border)] text-accent">
          <Icon name={playing ? "pause" : "play"} className="h-3 w-3" />
        </button>
        <span className="numeric ml-3 text-[8px] text-text-tertiary">{compact ? "PREVIEW" : "NOW"}</span>
        <div className="mx-3 h-[2px] flex-1 bg-[#24282b]"><div className={`h-full bg-accent ${compact ? "w-[36%]" : "w-[8%]"}`} /></div>
        {!compact ? <span className="numeric text-[8px] text-text-tertiary">+24H</span> : null}
        <div className="ml-4 flex border border-[var(--bd)]">
          {([0.5, 1, 2] as GlobeSimulationSpeed[]).map((speed) => (
            <button
              key={speed}
              onClick={() => setSimulationSpeed(speed)}
              className={`numeric h-6 min-w-8 px-1.5 text-[8px] font-medium transition-colors duration-120 ${simulationSpeed === speed ? "bg-[var(--acc-tint)] text-[var(--acc-text)]" : "text-text-tertiary hover:text-text-primary"}`}
            >
              {speed}×
            </button>
          ))}
        </div>
        {!compact ? <span className="numeric ml-4 text-[10px] font-medium text-[var(--acc-text)]">T+00:00:00</span> : null}
      </div>
    </div>
  );
}
