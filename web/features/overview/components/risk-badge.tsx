import type { RiskLevel } from "../types";

const styles: Record<RiskLevel, string> = {
  CRITICAL: "border-[var(--critical-border)] bg-[var(--critical-fill)] text-critical",
  HIGH: "border-[var(--high-border)] bg-[var(--high-fill)] text-high",
  MEDIUM: "border-[var(--medium-border)] bg-[var(--medium-fill)] text-medium",
  LOW: "border-[var(--low-border)] bg-[var(--low-fill)] text-low",
};

export function RiskBadge({ level, compact = false }: { level: RiskLevel; compact?: boolean }) {
  const label = compact && level === "CRITICAL" ? "CRIT" : compact && level === "MEDIUM" ? "MED" : level;

  return (
    <span className={`numeric inline-flex min-w-[76px] items-center justify-center border px-2 py-1 text-[9px] leading-none font-semibold tracking-[0.07em] ${styles[level]}`}>
      {label}
    </span>
  );
}
