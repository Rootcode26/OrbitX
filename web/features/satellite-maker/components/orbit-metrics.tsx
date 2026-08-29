import type { DerivedOrbit } from "../types";

const formatters = {
  velocity: (orbit: DerivedOrbit) => `${orbit.currentVelocityKmS.toFixed(3)} km/s`,
  period: (orbit: DerivedOrbit) => `${orbit.orbitalPeriodMinutes.toFixed(1)} min`,
  revolutions: (orbit: DerivedOrbit) => orbit.revolutionsPerDay.toFixed(2),
  axis: (orbit: DerivedOrbit) => `${orbit.semiMajorAxisKm.toFixed(0)} km`,
  apogee: (orbit: DerivedOrbit) => `${orbit.apogeeKm.toFixed(0)} km`,
  perigee: (orbit: DerivedOrbit) => `${orbit.perigeeKm.toFixed(0)} km`,
  eccentricity: (orbit: DerivedOrbit) => orbit.eccentricity.toFixed(5),
  altitude: (orbit: DerivedOrbit) => `${orbit.currentAltitudeKm.toFixed(1)} km`,
};

export function OrbitMetrics({ orbit }: { orbit: DerivedOrbit }) {
  const metrics = [
    { label: "Current velocity", value: formatters.velocity(orbit) },
    { label: "Orbital period", value: formatters.period(orbit) },
    { label: "Revolutions / day", value: formatters.revolutions(orbit) },
    { label: "Semi-major axis", value: formatters.axis(orbit) },
    { label: "Apogee", value: formatters.apogee(orbit) },
    { label: "Perigee", value: formatters.perigee(orbit) },
    { label: "Eccentricity", value: formatters.eccentricity(orbit) },
    { label: "Height at epoch", value: formatters.altitude(orbit) },
  ];

  return (
    <section className="grid grid-cols-2 border border-t-0 border-[var(--bd)] bg-surface-1 min-[1000px]:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="border-r border-b border-[var(--bd2)] px-3.5 py-3">
          <div className="text-[10px] font-medium text-text-tertiary">{metric.label}</div>
          <div className="numeric mt-1.5 text-[11.5px] font-medium text-text-primary">{metric.value}</div>
        </div>
      ))}
    </section>
  );
}
