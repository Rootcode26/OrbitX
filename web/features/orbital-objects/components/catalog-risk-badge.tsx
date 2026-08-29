import type { CatalogRiskLevel } from "../types";

const styles: Record<CatalogRiskLevel, string> = {
  CRITICAL: "border-[var(--critical-border)] bg-[var(--critical-fill)] text-critical",
  HIGH: "border-[var(--high-border)] bg-[var(--high-fill)] text-high",
  MEDIUM: "border-[var(--medium-border)] bg-[var(--medium-fill)] text-medium",
  LOW: "border-[var(--low-border)] bg-[var(--low-fill)] text-low",
};

export function CatalogRiskBadge({ level }: { level: CatalogRiskLevel }) {
  const label = level === "CRITICAL" ? "CRIT" : level === "MEDIUM" ? "MED" : level;
  return (
    <span className={`numeric inline-flex min-w-[64px] items-center justify-center border px-2 py-1 text-[8.5px] leading-none font-semibold tracking-[0.07em] ${styles[level]}`}>
      {label}
    </span>
  );
}
