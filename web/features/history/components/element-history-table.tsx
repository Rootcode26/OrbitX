import type { ElementSetRecord } from "../types";

export function ElementHistoryTable({ records }: { records: ElementSetRecord[] }) {
  return (
    <div className="max-h-[500px] overflow-auto">
      <table className="w-full min-w-[1180px] border-collapse">
        <thead className="sticky top-0 z-10 bg-surface-2 text-left">
          <tr className="border-b border-[var(--bd)]">
            {["#", "Epoch (local)", "TLE epoch (local)", "Alt km", "Apogee", "Perigee", "Δ alt", "Incl", "RAAN", "Mean motion", "B*", "Source"].map((heading, index) => (
              <th key={heading} className={`px-3 py-[9px] text-[10px] font-medium text-text-tertiary ${index >= 3 && index <= 10 ? "text-right" : ""}`}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.epochUtc} className="border-b border-[var(--bd2)] transition-colors duration-120 last:border-b-0 hover:bg-surface-3">
              <td className="numeric px-3 py-2.5 text-[10px] text-text-tertiary">{record.sequence}</td>
              <td className="numeric whitespace-nowrap px-3 py-2.5 text-[10.5px] text-text-secondary">{record.epochUtc}</td>
              <td className="numeric px-3 py-2.5 text-[10.5px] text-text-secondary">{record.tleEpoch}</td>
              <NumericCell strong>{record.altitudeKm.toFixed(2)}</NumericCell>
              <NumericCell>{record.apogeeKm.toFixed(1)}</NumericCell>
              <NumericCell>{record.perigeeKm.toFixed(1)}</NumericCell>
              <NumericCell tone={record.altitudeIncrease ? "nominal" : undefined}>{record.altitudeDeltaKm === null ? "—" : `${record.altitudeDeltaKm >= 0 ? "+" : ""}${record.altitudeDeltaKm.toFixed(3)}`}</NumericCell>
              <NumericCell>{record.inclinationDegrees.toFixed(4)}</NumericCell>
              <NumericCell>{record.raanDegrees.toFixed(3)}</NumericCell>
              <NumericCell>{record.meanMotionRevolutionsPerDay.toFixed(8)}</NumericCell>
              <NumericCell>{record.bstar === null ? "—" : record.bstar.toExponential(2)}</NumericCell>
              <td className="whitespace-nowrap px-3 py-2.5 text-[10.5px] text-text-secondary">{record.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NumericCell({ children, strong = false, tone }: { children: React.ReactNode; strong?: boolean; tone?: "nominal" }) {
  return <td className={`numeric whitespace-nowrap px-3 py-2.5 text-right text-[10.5px] ${strong ? "font-semibold text-text-primary" : tone === "nominal" ? "text-nominal" : "text-text-secondary"}`}>{children}</td>;
}
