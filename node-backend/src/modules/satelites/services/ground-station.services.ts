import {
  GroundStationInput,
  GroundStationPass,
  GroundStationPassRequest,
  GroundStationPassResponse,
  SatelliteTrajectoryPoint,
} from "../types.ts";
import { getSatelliteTrajectory } from "./satellite-trajectory.services.ts";

const EARTH_EQUATORIAL_RADIUS_KM = 6_378.137;
const EARTH_ECCENTRICITY_SQUARED = 0.00669437999014;
const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

interface ActivePass {
  riseTimeUtc: string;
  peakTimeUtc: string;
  latestTimeUtc: string;
  maximumElevationDegrees: number;
}

const greenwichMeanSiderealTime = (timestampUtc: string): number => {
  const julianDate = Date.parse(timestampUtc) / 86_400_000 + 2_440_587.5;
  const centuries = (julianDate - 2_451_545) / 36_525;
  const degrees = 280.46061837
    + 360.98564736629 * (julianDate - 2_451_545)
    + 0.000387933 * centuries ** 2
    - centuries ** 3 / 38_710_000;

  return ((degrees % 360) + 360) % 360 * DEGREES_TO_RADIANS;
};

const satelliteEcefPosition = (point: SatelliteTrajectoryPoint): [number, number, number] => {
  const angle = greenwichMeanSiderealTime(point.timestamp_utc);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const { x, y, z } = point.position_km;

  return [
    cosine * x + sine * y,
    -sine * x + cosine * y,
    z,
  ];
};

const stationEcefPosition = (station: GroundStationInput): [number, number, number] => {
  const latitude = station.latitude_degrees * DEGREES_TO_RADIANS;
  const longitude = station.longitude_degrees * DEGREES_TO_RADIANS;
  const altitudeKm = station.altitude_meters / 1_000;
  const sineLatitude = Math.sin(latitude);
  const cosineLatitude = Math.cos(latitude);
  const primeVerticalRadius = EARTH_EQUATORIAL_RADIUS_KM / Math.sqrt(1 - EARTH_ECCENTRICITY_SQUARED * sineLatitude ** 2);

  return [
    (primeVerticalRadius + altitudeKm) * cosineLatitude * Math.cos(longitude),
    (primeVerticalRadius + altitudeKm) * cosineLatitude * Math.sin(longitude),
    (primeVerticalRadius * (1 - EARTH_ECCENTRICITY_SQUARED) + altitudeKm) * sineLatitude,
  ];
};

export const calculateElevationDegrees = (point: SatelliteTrajectoryPoint, station: GroundStationInput): number => {
  const satellitePosition = satelliteEcefPosition(point);
  const stationPosition = stationEcefPosition(station);
  const latitude = station.latitude_degrees * DEGREES_TO_RADIANS;
  const longitude = station.longitude_degrees * DEGREES_TO_RADIANS;
  const deltaX = satellitePosition[0] - stationPosition[0];
  const deltaY = satellitePosition[1] - stationPosition[1];
  const deltaZ = satellitePosition[2] - stationPosition[2];
  const east = -Math.sin(longitude) * deltaX + Math.cos(longitude) * deltaY;
  const north = -Math.sin(latitude) * Math.cos(longitude) * deltaX
    - Math.sin(latitude) * Math.sin(longitude) * deltaY
    + Math.cos(latitude) * deltaZ;
  const up = Math.cos(latitude) * Math.cos(longitude) * deltaX
    + Math.cos(latitude) * Math.sin(longitude) * deltaY
    + Math.sin(latitude) * deltaZ;

  return Math.atan2(up, Math.hypot(east, north)) * RADIANS_TO_DEGREES;
};

const findStationPasses = (points: SatelliteTrajectoryPoint[], station: GroundStationInput, minimumElevationDegrees: number, stepSeconds: number): GroundStationPass[] => {
  const passes: GroundStationPass[] = [];
  let activePass: ActivePass | null = null;
  let previousTimestamp: number | null = null;

  const finishPass = () => {
    if (!activePass) return;

    passes.push({
      station,
      rise_time_utc: activePass.riseTimeUtc,
      peak_time_utc: activePass.peakTimeUtc,
      set_time_utc: activePass.latestTimeUtc,
      maximum_elevation_degrees: Number(activePass.maximumElevationDegrees.toFixed(2)),
    });
    activePass = null;
  };

  for (const point of points) {
    const timestamp = Date.parse(point.timestamp_utc);
    const sampleGapSeconds = previousTimestamp === null ? 0 : (timestamp - previousTimestamp) / 1_000;

    if (sampleGapSeconds > stepSeconds * 1.5) finishPass();

    const elevation = calculateElevationDegrees(point, station);

    if (elevation >= minimumElevationDegrees) {
      if (!activePass) {
        activePass = {
          riseTimeUtc: point.timestamp_utc,
          peakTimeUtc: point.timestamp_utc,
          latestTimeUtc: point.timestamp_utc,
          maximumElevationDegrees: elevation,
        };
      } else {
        activePass.latestTimeUtc = point.timestamp_utc;

        if (elevation > activePass.maximumElevationDegrees) {
          activePass.maximumElevationDegrees = elevation;
          activePass.peakTimeUtc = point.timestamp_utc;
        }
      }
    } else {
      finishPass();
    }

    previousTimestamp = timestamp;
  }

  finishPass();
  return passes;
};

export const calculateGroundStationPasses = async (request: GroundStationPassRequest): Promise<GroundStationPassResponse> => {
  const trajectory = await getSatelliteTrajectory(request);
  const passes = request.stations
    .flatMap((station) => findStationPasses(
      trajectory.points,
      station,
      request.minimum_elevation_degrees,
      request.step_seconds,
    ))
    .sort((first, second) => Date.parse(first.rise_time_utc) - Date.parse(second.rise_time_utc));

  return {
    satellite: trajectory.satellite,
    start_time_utc: trajectory.start_time_utc,
    end_time_utc: trajectory.end_time_utc,
    minimum_elevation_degrees: request.minimum_elevation_degrees,
    passes,
    propagation_errors: trajectory.errors,
  };
};
