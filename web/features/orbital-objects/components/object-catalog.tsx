import { Panel } from "@/components/ui/panel";
import type { CatalogObjectType, ObjectCatalogProps } from "../types";
import { CatalogPagination } from "./catalog-pagination";

const typeLabels: Record<CatalogObjectType, string> = {
  PAYLOAD: "PAYLOAD",
  "ROCKET BODY": "R/B",
  DEBRIS: "DEBRIS",
};

const typeColors: Record<CatalogObjectType, string> = {
  PAYLOAD: "text-accent",
  "ROCKET BODY": "text-[#b2843c]",
  DEBRIS: "text-text-tertiary",
};

export function ObjectCatalog({
  objects,
  selectedObjectId,
  currentPage,
  totalPages,
  totalObjects,
  pageSize,
  onSelect,
  onPageChange,
}: ObjectCatalogProps) {
  const first = totalObjects === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const last = Math.min(currentPage * pageSize, totalObjects);

  return (
    <Panel title="Object catalog" meta={<span className="numeric">{first}–{last} of {totalObjects} objects</span>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse text-left">
          <thead className="bg-[rgba(228,222,208,.016)] text-[10.5px] text-text-tertiary">
            <tr>
              <th className="px-3.5 py-[9px] font-medium">Object</th>
              <th className="px-3.5 py-[9px] font-medium">Name</th>
              <th className="px-3.5 py-[9px] text-right font-medium">NORAD</th>
              <th className="px-3.5 py-[9px] text-right font-medium">Type</th>
              <th className="px-3.5 py-[9px] text-right font-medium">Alt km</th>
              <th className="px-3.5 py-[9px] text-right font-medium">Incl</th>
              <th className="px-3.5 py-[9px] text-right font-medium">Vel</th>
              <th className="px-3.5 py-[9px] text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {objects.map((object) => {
              const selected = object.id === selectedObjectId;
              return (
                <tr
                  key={object.id}
                  onClick={() => onSelect(object.id)}
                  className={`cursor-pointer border-t border-[var(--bd2)] transition-colors duration-150 hover:bg-surface-3 ${selected ? "bg-surface-3 shadow-[inset_2px_0_0_var(--acc)]" : ""}`}
                >
                  <td className="numeric px-3.5 py-[9px] text-[12px] font-medium text-text-secondary">{object.internationalDesignator ?? object.name}</td>
                  <td className="px-3.5 py-[9px] text-[12.5px] font-medium">{object.name}</td>
                  <td className="numeric px-3.5 py-[9px] text-right text-[11px] text-text-secondary">{object.noradCatId}</td>
                  <td className={`numeric px-3.5 py-[9px] text-right text-[8.5px] font-semibold tracking-[0.07em] ${typeColors[object.objectType]}`}>{typeLabels[object.objectType]}</td>
                  <td className="numeric px-3.5 py-[9px] text-right text-[11px]">{object.altitudeKm.toFixed(1)}</td>
                  <td className="numeric px-3.5 py-[9px] text-right text-[11px] text-text-secondary">{object.inclinationDegrees.toFixed(2)}</td>
                  <td className="numeric px-3.5 py-[9px] text-right text-[11px] text-text-secondary">{object.velocityKmS.toFixed(2)}</td>
                  <td className="numeric px-3.5 py-[9px] text-right text-[10px] text-text-tertiary">{object.lastUpdatedMinutes}m</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {objects.length === 0 ? <div className="px-4 py-14 text-center text-text-tertiary">No objects match the selected filters.</div> : null}
      </div>
      {totalPages > 0 ? <CatalogPagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} /> : null}
    </Panel>
  );
}
