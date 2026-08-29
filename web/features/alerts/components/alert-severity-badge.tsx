import type { AlertSeverity } from "../types";

const styles: Record<AlertSeverity, string> = {
  CRITICAL: "border-[var(--critical-border)] bg-[var(--critical-fill)] text-critical",
  HIGH: "border-[var(--high-border)] bg-[var(--high-fill)] text-high",
  MEDIUM: "border-[var(--medium-border)] bg-[var(--medium-fill)] text-medium",
  LOW: "border-[var(--low-border)] bg-[var(--low-fill)] text-low",
};

export function AlertSeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span className={`numeric inline-flex min-w-[70px] items-center justify-center border px-2 py-1 text-[8.5px] font-semibold tracking-[0.06em] ${styles[severity]}`}>
      {severity}
    </span>
  );
}

