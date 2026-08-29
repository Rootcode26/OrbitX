export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type AlertFilter = "ALL" | AlertSeverity | "RESOLVED";
export type AlertSource = "Conjunction screening" | "Orbit data" | "Propagation" | "Catalogue sync" | "System";

export interface OperationsAlert {
  id: string;
  severity: AlertSeverity;
  source: AlertSource;
  occurredAt: string;
  title: string;
  description: string;
  acknowledged: boolean;
  resolved: boolean;
  conjunctionEventId?: string;
}

export interface AlertCounts {
  all: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved: number;
  unacknowledged: number;
}

