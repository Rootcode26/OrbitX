import { Panel } from "@/components/ui/panel";
import { formatTimeOffset } from "../pairwise-calculations";
import type { PairwiseInteraction } from "../types";

interface PairwiseTableProps {
  interactions: PairwiseInteraction[];
}

export function PairwiseTable({ interactions }: PairwiseTableProps) {
  return (
    <Panel
      title="Pairwise interaction · 24 h propagation"
      meta={<span className="numeric">Object A is the reference · compared against each Object B</span>}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse">
          <thead className="bg-[rgba(228,222,208,.016)] text-left">
            <tr className="border-b border-[var(--bd)]">
              {[
                "Object A", "Object B", "Current sep", "Min sep", "At", "Rel vel", "Δ alt", "Δ incl", "Verdict",
              ].map((heading, index) => (
                <th key={heading} className={`px-3.5 py-[9px] text-[10px] font-medium text-text-tertiary ${index > 1 ? "text-right" : ""}`}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {interactions.map((interaction) => (
              <tr key={`${interaction.objectA.noradCatId}-${interaction.objectB.noradCatId}`} className="border-b border-[var(--bd2)] last:border-b-0 hover:bg-surface-3">
                <td className="whitespace-nowrap px-3.5 py-3 text-[11.5px] font-medium text-text-primary">{interaction.objectA.name}</td>
                <td className="whitespace-nowrap px-3.5 py-3 text-[11.5px] text-text-secondary">{interaction.objectB.name}</td>
                <NumericCell>{interaction.currentSeparationKm.toFixed(0)} km</NumericCell>
                <NumericCell accent>{interaction.minimumSeparationKm.toFixed(1)} km</NumericCell>
                <NumericCell>{formatTimeOffset(interaction.minutesToMinimum)}</NumericCell>
                <NumericCell>{interaction.relativeVelocityKmS.toFixed(2)} km/s</NumericCell>
                <NumericCell>{interaction.altitudeDifferenceKm.toFixed(1)} km</NumericCell>
                <NumericCell>{interaction.inclinationDifferenceDegrees.toFixed(2)}°</NumericCell>
                <td className="px-3.5 py-3 text-right">
                  <span className={`numeric inline-block min-w-28 border px-2 py-1 text-center text-[8px] font-semibold tracking-[0.07em] ${interaction.verdict === "MONITOR" ? "border-[var(--medium-border)] bg-[var(--medium-fill)] text-medium" : "border-[var(--bd)] bg-[rgba(123,135,144,.06)] text-low"}`}>
                    {interaction.verdict}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!interactions.length ? <p className="px-4 py-10 text-center text-[10.5px] text-text-tertiary">Select at least two objects to generate pairwise results.</p> : null}
      </div>
    </Panel>
  );
}

function NumericCell({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return <td className={`numeric whitespace-nowrap px-3.5 py-3 text-right text-[10.5px] ${accent ? "text-[var(--acc-text)]" : "text-text-secondary"}`}>{children}</td>;
}
