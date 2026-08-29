export type GlobeObjectClass = "active" | "inactive" | "debris" | "rocket" | "focused";
export type GlobeFilter = "satellites" | "debris" | "rocketBodies" | "orbits" | "labels";
export type GlobeViewMode = "3D" | "2D";
export type GlobeSimulationSpeed = 0.5 | 1 | 2;

export interface GlobeObject {
  id: number;
  name: string;
  objectClass: GlobeObjectClass;
  orbitRadius: number;
  inclination: number;
  raan: number;
  argumentOfPerigee: number;
  eccentricity: number;
  phase: number;
  angularSpeed: number;
}

export interface GlobeFilterState {
  satellites: boolean;
  debris: boolean;
  rocketBodies: boolean;
  orbits: boolean;
  labels: boolean;
}

export interface OrbitalGlobeProps {
  compact?: boolean;
  finder?: boolean;
  featuredObject?: GlobeObject;
  tracking?: boolean;
  visibleObjectIds?: number[];
  selectedObjectId?: number;
  onObjectSelect?: (objectId: number) => void;
  objects?: GlobeObject[];
}
