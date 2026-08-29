import {
  GeneratedTle,
  SatelliteMakerDerivedOrbit,
  SatelliteMakerRequest,
} from "../types.ts";

const earthRadiusKm = 6_378.137;
const earthGravitationalParameter = 398_600.4418;
const secondsPerDay = 86_400;

const calculateChecksum = (line: string): number => {
  let checksum = 0;

  for (const character of line) {
    if (character >= "0" && character <= "9") {
      checksum += Number(character);
    } else if (character === "-") {
      checksum += 1;
    }
  }

  return checksum % 10;
};

const withChecksum = (line: string): string => `${line}${calculateChecksum(line)}`;

const formatEpochDay = (epoch: Date): string => {
  const yearStart = Date.UTC(epoch.getUTCFullYear(), 0, 1);
  const day = (epoch.getTime() - yearStart) / 86_400_000 + 1;
  return day.toFixed(8).padStart(12, "0");
};

const formatBstar = (value: number): string => {
  if (value === 0) return " 00000+0";

  let exponent = Math.floor(Math.log10(Math.abs(value))) + 1;
  let digits = Math.round(Math.abs(value) / 10 ** exponent * 100_000);

  if (digits === 100_000) {
    digits = 10_000;
    exponent += 1;
  }

  const mantissaSign = value < 0 ? "-" : " ";
  const exponentSign = exponent < 0 ? "-" : "+";

  return `${mantissaSign}${String(digits).padStart(5, "0")}${exponentSign}${Math.abs(exponent)}`;
};

export const deriveMakerOrbit = (request: SatelliteMakerRequest): SatelliteMakerDerivedOrbit => {
  const semiMajorAxisKm = earthRadiusKm + request.altitude_km;
  const apogeeKm = request.altitude_km + request.apsis_offset_km;
  const perigeeKm = request.altitude_km - request.apsis_offset_km;
  const apogeeRadiusKm = earthRadiusKm + apogeeKm;
  const perigeeRadiusKm = earthRadiusKm + perigeeKm;
  const eccentricity = (
    (apogeeRadiusKm - perigeeRadiusKm)
    / (apogeeRadiusKm + perigeeRadiusKm)
  );
  const periodSeconds = 2 * Math.PI * Math.sqrt(
    semiMajorAxisKm ** 3 / earthGravitationalParameter,
  );

  return {
    semi_major_axis_km: semiMajorAxisKm,
    apogee_km: apogeeKm,
    perigee_km: perigeeKm,
    eccentricity,
    orbital_period_minutes: periodSeconds / 60,
    revolutions_per_day: secondsPerDay / periodSeconds,
  };
};

export const buildMakerTle = (request: SatelliteMakerRequest, orbit: SatelliteMakerDerivedOrbit): GeneratedTle => {
  const epoch = new Date(request.epoch_utc);
  const satelliteNumber = String(request.temporary_norad_id).padStart(5, "0");
  const epochYear = String(epoch.getUTCFullYear()).slice(-2);
  const internationalDesignator = `${epochYear}001A`.padEnd(8, " ");
  const eccentricity = String(
    Math.min(9_999_999, Math.round(orbit.eccentricity * 10_000_000)),
  ).padStart(7, "0");
  const line1 = [
    `1 ${satelliteNumber}U ${internationalDesignator}`,
    ` ${epochYear}${formatEpochDay(epoch)}`,
    "  .00000000  00000+0 ",
    formatBstar(request.bstar),
    " 0  999",
  ].join("");
  const line2 = [
    `2 ${satelliteNumber}`,
    ` ${request.inclination_degrees.toFixed(4).padStart(8, " ")}`,
    ` ${request.raan_degrees.toFixed(4).padStart(8, " ")}`,
    ` ${eccentricity}`,
    ` ${request.argument_of_perigee_degrees.toFixed(4).padStart(8, " ")}`,
    ` ${request.phase_degrees.toFixed(4).padStart(8, " ")}`,
    ` ${orbit.revolutions_per_day.toFixed(8).padStart(11, " ")}`,
    String(0).padStart(5, " "),
  ].join("");

  if (line1.length !== 68 || line2.length !== 68) {
    throw new Error("Generated TLE has an invalid fixed-width layout");
  }

  return {
    line1: withChecksum(line1),
    line2: withChecksum(line2),
  };
};
