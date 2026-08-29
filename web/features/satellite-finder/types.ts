export type FinderObjectClass = "active" | "inactive" | "debris" | "rocket";
export type PairVerdict = "NO INTERACTION" | "MONITOR" | "SCREENED";

export interface CartesianVector {
  x: number;
  y: number;
  z: number;
}

export interface FinderObject {
  noradCatId: number;
  name: string;
  objectClass: FinderObjectClass;
  altitudeKm: number;
  inclinationDegrees: number;
  velocityKmS: number;
  orbitalPeriodMinutes: number;
  positionEciKm: CartesianVector;
  velocityEciKmS: CartesianVector;
  isUserCreated?: boolean;
}

export interface PairwiseInteraction {
  objectA: FinderObject;
  objectB: FinderObject;
  currentSeparationKm: number;
  minimumSeparationKm: number;
  minutesToMinimum: number;
  relativeVelocityKmS: number;
  altitudeDifferenceKm: number;
  inclinationDifferenceDegrees: number;
  verdict: PairVerdict;
}
