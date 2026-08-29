import type { ConjunctionRiskLevel } from "../types";

const styles: Record<ConjunctionRiskLevel, string> = {
  CRITICAL: "border-[var(--critical-border)] bg-[var(--critical-fill)] text-critical",
  HIGH: "border-[var(--high-border)] bg-[var(--high-fill)] text-high",
  MEDIUM: "border-[var(--medium-border)] bg-[var(--medium-fill)] text-medium",
  LOW: "border-[var(--low-border)] bg-[var(--low-fill)] text-low",
};

export function ConjunctionRiskBadge({
  level,
  full = false,
}: {
  level: ConjunctionRiskLevel;
  full?: boolean;
}) {
  const compactLabel = level === "CRITICAL" ? "CRIT" : level === "MEDIUM" ? "MED" : level;

  return (
    <span
      className={`numeric inline-flex items-center justify-center border px-2 py-1 text-[9px] leading-none font-semibold tracking-[0.07em] ${full ? "min-w-[118px] py-2" : "min-w-[48px]"} ${styles[level]}`}
    >
      {full ? `${level} RISK` : compactLabel}
    </span>
  );
}

