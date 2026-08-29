import type { ReactNode } from "react";
import type { ConjunctionRiskLevel } from "@/features/conjunctions/types";

export interface AnalyticsAccordionProps {
  title: string;
  meta: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}

export interface ScreeningVolumeBucket {
  label: string;
  critical: number;
  high: number;
  other: number;
  total: number;
}

export interface DistributionBucket {
  label: string;
  count: number;
  tone: "critical" | "high" | "medium" | "neutral";
}

export interface ObjectCategoryMetric {
  label: string;
  count: number;
  tone: "active" | "inactive" | "rocket" | "debris";
}

export interface AltitudeDensityBucket {
  label: string;
  count: number;
  highlighted: boolean;
}

export interface RiskDistributionMetric {
  level: ConjunctionRiskLevel;
  count: number;
  percentage: number;
}

