import type { CatalogObjectType, CatalogRiskLevel, OrbitalObject } from "./types";

const featuredObjects: OrbitalObject[] = [
  { id: "aqua", noradCatId: 27424, name: "AQUA", objectType: "PAYLOAD", status: "ACTIVE", owner: "USA", launchDate: "2002-05-04", altitudeKm: 702, apogeeKm: 705, perigeeKm: 699, inclinationDegrees: 98.19, raanDegrees: 149.2, velocityKmS: 7.507, orbitalPeriodMinutes: 98.7, tleEpoch: "2026-08-27T04:32:00Z", lastUpdatedMinutes: 8, risk: "MEDIUM" },
  { id: "atlas-5", noradCatId: 39480, name: "ATLAS 5 CENTAUR R/B", objectType: "ROCKET BODY", status: "INACTIVE", owner: "USA", launchDate: "2013-07-19", altitudeKm: 1109, apogeeKm: 1126, perigeeKm: 1092, inclinationDegrees: 63.4, raanDegrees: 28.4, velocityKmS: 7.3, orbitalPeriodMinutes: 107.2, tleEpoch: "2026-08-27T03:58:00Z", lastUpdatedMinutes: 32, risk: "LOW" },
  { id: "capella-9", noradCatId: 55074, name: "CAPELLA-9", objectType: "PAYLOAD", status: "ACTIVE", owner: "USA", launchDate: "2023-01-03", altitudeKm: 528, apogeeKm: 531, perigeeKm: 525, inclinationDegrees: 53, raanDegrees: 100.6, velocityKmS: 7.6, orbitalPeriodMinutes: 95.1, tleEpoch: "2026-08-27T04:14:00Z", lastUpdatedMinutes: 26, risk: "LOW" },
  { id: "cartosat-3", noradCatId: 44804, name: "CARTOSAT-3", objectType: "PAYLOAD", status: "ACTIVE", owner: "IND", launchDate: "2019-11-27", altitudeKm: 509, apogeeKm: 512, perigeeKm: 506, inclinationDegrees: 97.5, raanDegrees: 210.2, velocityKmS: 7.61, orbitalPeriodMinutes: 94.8, tleEpoch: "2026-08-27T04:09:00Z", lastUpdatedMinutes: 23, risk: null },
  { id: "cosmos-2251", noradCatId: 22675, name: "COSMOS 2251", objectType: "PAYLOAD", status: "INACTIVE", owner: "CIS", launchDate: "1993-06-16", altitudeKm: 785, apogeeKm: 803, perigeeKm: 775, inclinationDegrees: 74.04, raanDegrees: 18.3, velocityKmS: 7.46, orbitalPeriodMinutes: 100.5, tleEpoch: "2026-08-27T03:45:00Z", lastUpdatedMinutes: 15, risk: null },
  { id: "cosmos-deb-1520", noradCatId: 34404, name: "COSMOS 2251 DEB 1520", objectType: "DEBRIS", status: "INACTIVE", owner: "CIS", launchDate: "1993-06-16", altitudeKm: 811.3, apogeeKm: 844, perigeeKm: 778, inclinationDegrees: 73.77, raanDegrees: 182.8, velocityKmS: 7.45, orbitalPeriodMinutes: 101, tleEpoch: "2026-08-27T03:41:00Z", lastUpdatedMinutes: 125, risk: "CRITICAL" },
  { id: "iss", noradCatId: 25544, name: "ISS (ZARYA)", objectType: "PAYLOAD", status: "ACTIVE", owner: "ISS", launchDate: "1998-11-20", altitudeKm: 420, apogeeKm: 423, perigeeKm: 417, inclinationDegrees: 51.64, raanDegrees: 183.2, velocityKmS: 7.661, orbitalPeriodMinutes: 92.8, tleEpoch: "2026-08-27T04:32:00Z", lastUpdatedMinutes: 2, risk: "HIGH" },
  { id: "jason-3", noradCatId: 41240, name: "JASON-3", objectType: "PAYLOAD", status: "ACTIVE", owner: "USA", launchDate: "2016-01-17", altitudeKm: 1336, apogeeKm: 1342, perigeeKm: 1330, inclinationDegrees: 66.04, raanDegrees: 73.7, velocityKmS: 7.2, orbitalPeriodMinutes: 112.4, tleEpoch: "2026-08-27T03:52:00Z", lastUpdatedMinutes: 18, risk: "LOW" },
  { id: "starlink-5600", noradCatId: 55601, name: "STARLINK-5600", objectType: "PAYLOAD", status: "ACTIVE", owner: "USA", launchDate: "2023-02-17", altitudeKm: 560.5, apogeeKm: 563, perigeeKm: 558, inclinationDegrees: 97.63, raanDegrees: 302.8, velocityKmS: 7.583, orbitalPeriodMinutes: 95.7, tleEpoch: "2026-08-27T04:26:00Z", lastUpdatedMinutes: 5, risk: "CRITICAL" },
  { id: "terra", noradCatId: 25994, name: "TERRA", objectType: "PAYLOAD", status: "ACTIVE", owner: "USA", launchDate: "1999-12-18", altitudeKm: 705, apogeeKm: 708, perigeeKm: 702, inclinationDegrees: 98.2, raanDegrees: 141.7, velocityKmS: 7.5, orbitalPeriodMinutes: 98.9, tleEpoch: "2026-08-27T04:18:00Z", lastUpdatedMinutes: 12, risk: "MEDIUM" },
];

const owners = ["USA", "CIS", "PRC", "ESA", "IND", "JPN"];
const payloadNames = ["SENTINEL", "LANDSAT", "ONEWEB", "METOP", "SWARM", "IRIDIUM"];
const rocketNames = ["FALCON 9 R/B", "CZ-4B R/B", "ARIANE 5 R/B", "H-2A R/B"];

function objectTypeFor(index: number): CatalogObjectType {
  if (index % 7 === 0) return "ROCKET BODY";
  if (index % 3 === 0) return "PAYLOAD";
  return "DEBRIS";
}

function riskFor(index: number): CatalogRiskLevel | null {
  if (index % 29 === 0) return "CRITICAL";
  if (index % 17 === 0) return "HIGH";
  if (index % 11 === 0) return "MEDIUM";
  if (index % 7 === 0) return "LOW";
  return null;
}

const generatedObjects: OrbitalObject[] = Array.from({ length: 90 }, (_, index) => {
  const sequence = index + 1;
  const objectType = objectTypeFor(sequence);
  const altitudeKm = 320 + ((sequence * 37) % 1160);
  const inclinationDegrees = 18 + ((sequence * 7.31) % 80);
  const name = objectType === "PAYLOAD"
    ? `${payloadNames[sequence % payloadNames.length]}-${String(sequence).padStart(2, "0")}`
    : objectType === "ROCKET BODY"
      ? `${rocketNames[sequence % rocketNames.length]} ${String(2100 + sequence)}`
      : `COSMOS DEB ${String(1700 + sequence)}`;

  return {
    id: `generated-${sequence}`,
    noradCatId: 60000 + sequence,
    name,
    objectType,
    status: objectType === "PAYLOAD" && sequence % 5 !== 0 ? "ACTIVE" : "INACTIVE",
    owner: owners[sequence % owners.length],
    launchDate: `${1996 + (sequence % 29)}-${String((sequence % 12) + 1).padStart(2, "0")}-${String((sequence % 27) + 1).padStart(2, "0")}`,
    altitudeKm,
    apogeeKm: altitudeKm + 4 + (sequence % 22),
    perigeeKm: Math.max(0, altitudeKm - 4 - (sequence % 18)),
    inclinationDegrees,
    raanDegrees: (sequence * 19.7) % 360,
    velocityKmS: 7.05 + ((sequence * 0.037) % 0.72),
    orbitalPeriodMinutes: 89 + ((sequence * 1.17) % 28),
    tleEpoch: `2026-08-27T${String(sequence % 5).padStart(2, "0")}:${String((sequence * 7) % 60).padStart(2, "0")}:00Z`,
    lastUpdatedMinutes: 3 + ((sequence * 7) % 176),
    risk: riskFor(sequence),
  };
});

export const orbitalObjects: OrbitalObject[] = [...featuredObjects, ...generatedObjects];
export const catalogOwners = Array.from(new Set(orbitalObjects.map((object) => object.owner))).sort();

export const defaultCatalogFilters = {
  search: "",
  objectType: "ALL",
  status: "ANY",
  risk: "ANY",
  owner: "ALL",
  minimumAltitude: null,
  maximumAltitude: null,
} as const;
