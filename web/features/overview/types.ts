export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface OverviewMetric {
  label: string;
  value: string;
  unit?: string;
  detail: string;
  tone?: "default" | "accent" | "critical";
}

export interface GlossaryTerm {
  term: string;
  explanation: string;
}

export interface GlossaryGroup {
  title: string;
  terms: GlossaryTerm[];
}
