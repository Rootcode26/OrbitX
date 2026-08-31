import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLocalDateTime } from "@/lib/format-date-time";
import type { NearbySatelliteResult } from "../api";

export function NearbySatelliteTable({
  result,
  loading,
  currentPage,
  onPageChange,
}: {
  result: NearbySatelliteResult | null;
  loading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = result?.page.total_pages ?? 0;

  return (
    <Panel
      title="Nearby satellites · current stored state"
      meta={<span className="numeric">{result ? `${result.page.total_items.toLocaleString()} within ${result.radius_km.toLocaleString()} km` : "1,000 km radius"}</span>}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse">
          <thead className="bg-[rgba(228,222,208,.016)] text-left">
            <tr className="border-b border-[var(--bd)]">
              {[
                "Satellite", "NORAD", "Type", "Owner", "Distance", "Altitude", "Speed", "Relative speed", "Inclination", "Latitude", "Longitude", "State time",
              ].map((heading, index) => (
                <th key={heading} className={`px-3.5 py-[9px] text-[10px] font-medium text-text-tertiary ${index > 0 ? "text-right" : ""}`}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && !result ? Array.from({ length: 10 }).map((_, row) => (
              <tr key={row} className="border-b border-[var(--bd2)]">
                {Array.from({ length: 12 }).map((__, column) => (
                  <td key={column} className="px-3.5 py-3"><Skeleton className="h-2.5 w-full" /></td>
                ))}
              </tr>
            )) : result?.satellites.map((satellite) => (
              <tr key={satellite.norad_cat_id} className="border-b border-[var(--bd2)] last:border-b-0 hover:bg-surface-3">
                <td className="whitespace-nowrap px-3.5 py-3 text-[11.5px] font-medium text-text-primary">{satellite.name}</td>
                <NumericCell>{satellite.norad_cat_id}</NumericCell>
                <NumericCell>{objectTypeLabel(satellite.object_type)}</NumericCell>
                <NumericCell>{satellite.owner ?? "—"}</NumericCell>
                <NumericCell accent>{satellite.separation_km.toFixed(1)} km</NumericCell>
                <NumericCell>{satellite.height_km.toFixed(1)} km</NumericCell>
                <NumericCell>{satellite.speed_km_s.toFixed(3)} km/s</NumericCell>
                <NumericCell>{satellite.relative_velocity_km_s.toFixed(3)} km/s</NumericCell>
                <NumericCell>{satellite.inclination_degrees.toFixed(2)}°</NumericCell>
                <NumericCell>{satellite.latitude_degrees.toFixed(2)}°</NumericCell>
                <NumericCell>{satellite.longitude_degrees.toFixed(2)}°</NumericCell>
                <NumericCell>{formatLocalDateTime(satellite.calculated_at)}</NumericCell>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && result && result.satellites.length === 0 ? (
          <p className="px-4 py-10 text-center text-[10.5px] text-text-tertiary">No stored satellite states are within 1,000 km of this reference.</p>
        ) : !loading && !result ? (
          <p className="px-4 py-10 text-center text-[10.5px] text-text-tertiary">Select a reference satellite to scan the database.</p>
        ) : null}
      </div>
      {result && result.page.total_items > 0 ? (
        <div className="flex items-center justify-between border-t border-[var(--bd)] px-3.5 py-2.5">
          <span className="numeric text-[9px] text-text-tertiary">{result.page.size} satellites per page</span>
          <div className="flex gap-1">
            <button
              disabled={currentPage <= 1 || loading}
              onClick={() => onPageChange(currentPage - 1)}
              className="h-7 border border-[var(--bd)] px-2.5 text-[10px] text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
            >
              Previous
            </button>
            <button
              disabled={currentPage >= totalPages || loading}
              onClick={() => onPageChange(currentPage + 1)}
              className="h-7 border border-[var(--bd)] px-2.5 text-[10px] text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

function objectTypeLabel(value: string | null): string {
  if (value === "PAY") return "Payload";
  if (value === "R/B") return "R/B";
  if (value === "DEB") return "Debris";
  return "Unknown";
}

function NumericCell({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return <td className={`numeric whitespace-nowrap px-3.5 py-3 text-right text-[10.5px] ${accent ? "text-[var(--acc-text)]" : "text-text-secondary"}`}>{children}</td>;
}
