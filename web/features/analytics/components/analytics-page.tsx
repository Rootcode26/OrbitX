"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConjunctionRiskLevel } from "@/features/conjunctions/types";
import { useSatelliteAnalytics } from "../hooks/use-satellite-analytics";
import type {
  AltitudeDensityBucket,
  DistributionBucket,
  ObjectCategoryMetric,
  RankedCountMetric,
  RiskDistributionMetric,
  ScreeningVolumeBucket,
} from "../types";
import { AltitudeDensityChart } from "./altitude-density-chart";
import { AnalyticsAccordion } from "./analytics-accordion";
import { AnalyticsSummary } from "./analytics-summary";
import { ConjunctionTimeline } from "./conjunction-timeline";
import type { TimelineEvent } from "./conjunction-timeline";
import { MissDistanceChart } from "./miss-distance-chart";
import { ObjectClassificationChart } from "./object-classification-chart";
import { RiskDistributionChart } from "./risk-distribution-chart";
import { RankedCountChart } from "./ranked-count-chart";
import { ScreeningVolumeChart } from "./screening-volume-chart";

const categoryMeta = {
  active_payloads: { label: "Active payloads", tone: "active" },
  inactive_payloads: { label: "Inactive payloads", tone: "inactive" },
  rocket_bodies: { label: "Rocket bodies", tone: "rocket" },
  debris: { label: "Debris", tone: "debris" },
  unknown: { label: "Unknown", tone: "unknown" },
} as const;

const missDistanceTones: DistributionBucket["tone"][] = [
  "critical",
  "high",
  "medium",
  "neutral",
  "neutral",
  "neutral",
];
const missDistanceLabels = ["< 1 km", "1 - 10 km", "10 - 50 km", "50 - 100 km", "100 - 250 km", "250 - 500 km"];
const riskLevels: ConjunctionRiskLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export function AnalyticsPage() {
  const analytics = useSatelliteAnalytics();
  const [referenceTime] = useState(() => Date.now());

  return (
    <AppShell title="Analytics" subtitle="Population and risk statistics" activePath="/analytics">
      <main className="space-y-3.5 p-4 min-[1240px]:p-5">
        {analytics.isPending ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full" />
          ))
        ) : analytics.isError || !analytics.data ? (
          <EmptyState
            tone="error"
            title="Unable to load analytics"
            description="The analytics service could not be reached. Check that the backend is running."
          />
        ) : (
          (() => {
            const data = analytics.data;
            const conjunctions = data.conjunctions;

            const objectCategories: ObjectCategoryMetric[] = data.classifications
              .filter((metric): metric is typeof metric & { category: keyof typeof categoryMeta } => metric.category in categoryMeta)
              .map((metric) => ({
                label: categoryMeta[metric.category].label,
                count: metric.count,
                tone: categoryMeta[metric.category].tone,
              }));

            const altitudeDensity: AltitudeDensityBucket[] = data.altitude_density.map((bucket) => ({
              label: `${bucket.minimum_km}–${bucket.maximum_km}`,
              count: bucket.count,
              highlighted: bucket.minimum_km >= 700 && bucket.minimum_km < 900,
            }));
            const peakAltitude = altitudeDensity.reduce<AltitudeDensityBucket | null>(
              (peak, bucket) => (!peak || bucket.count > peak.count ? bucket : peak),
              null,
            );

            const actionableRisks = conjunctions.risk_distribution.filter((metric) => metric.risk_level !== "CLEAR");
            const actionableRiskTotal = actionableRisks.reduce((total, metric) => total + metric.count, 0);
            const riskCounts = new Map(actionableRisks.map((metric) => [metric.risk_level, metric.count]));
            const riskDistribution: RiskDistributionMetric[] = riskLevels.map((level) => {
              const count = riskCounts.get(level) ?? 0;
              return {
                level,
                count,
                percentage: actionableRiskTotal === 0 ? 0 : Math.round(count * 1_000 / actionableRiskTotal) / 10,
              };
            });
            const critical = riskDistribution.find((metric) => metric.level === "CRITICAL")?.count ?? 0;
            const high = riskDistribution.find((metric) => metric.level === "HIGH")?.count ?? 0;
            const orbitCoverage = data.total_objects === 0
              ? 0
              : data.objects_with_orbit_data * 100 / data.total_objects;
            const activeObjects = data.operational_statuses.find((metric) => metric.name === "active")?.count ?? 0;
            const unknownStatusObjects = data.operational_statuses.find((metric) => metric.name === "unknown")?.count ?? 0;

            const missDistanceCounts = new Map(conjunctions.miss_distance_distribution.map((bucket) => [bucket.label, bucket.count]));
            const missDistanceDistribution: DistributionBucket[] = missDistanceLabels.map((label, index) => ({
              label,
              count: missDistanceCounts.get(label) ?? 0,
              tone: missDistanceTones[index] ?? "neutral",
            }));
            const insideOneKm = missDistanceDistribution[0]?.count ?? 0;

            const screeningVolume: ScreeningVolumeBucket[] = conjunctions.events_over_time.map((day) => ({
              label: day.date.slice(5),
              critical: day.critical,
              high: day.high,
              other: day.medium + day.low + day.clear,
              total: day.total,
            }));

            const timelineEvents: TimelineEvent[] = conjunctions.upcoming_events
              .filter((event) => event.risk_level !== "CLEAR" && event.minimum_separation_km !== null)
              .map((event) => {
              const remainingHours = event.tca ? Math.max(0, (new Date(event.tca).getTime() - referenceTime) / 3_600_000) : 0;
              const hours = Math.floor(remainingHours);
              const minutes = Math.floor((remainingHours - hours) * 60);
              return {
                id: event.id,
                objectAName: event.object_a.name,
                objectBName: event.object_b.name,
                risk: event.risk_level as ConjunctionRiskLevel,
                tcaHours: remainingHours,
                tcaLabel: `${hours}h ${String(minutes).padStart(2, "0")}m`,
                minimumSeparationKm: event.minimum_separation_km ?? 0,
                riskScore: Math.min(10, Math.max(0, (event.risk_score ?? 0) / 10)),
              };
            });

            const ownerMetrics: RankedCountMetric[] = data.top_owners.map((metric) => ({
              label: metric.name,
              count: metric.count,
              percentage: data.total_objects === 0 ? 0 : metric.count * 100 / data.total_objects,
              tone: "accent",
            }));
            const operationalStatusMetrics: RankedCountMetric[] = data.operational_statuses.map((metric) => ({
              label: `${metric.name.slice(0, 1).toUpperCase()}${metric.name.slice(1)}`,
              count: metric.count,
              percentage: data.total_objects === 0 ? 0 : metric.count * 100 / data.total_objects,
              tone: metric.name === "active" ? "active" : metric.name === "inactive" ? "inactive" : "unknown",
            }));

            return (
              <>
                <AnalyticsSummary metrics={[
                  { label: "Catalogued objects", value: data.total_objects.toLocaleString(), detail: "current stored catalog" },
                  { label: "Objects with orbit data", value: data.objects_with_orbit_data.toLocaleString(), detail: `${orbitCoverage.toFixed(1)}% catalog coverage`, tone: "accent" },
                  { label: "Operationally active", value: activeObjects.toLocaleString(), detail: "current status classification", tone: "accent" },
                  { label: "Screened events", value: conjunctions.total_events.toLocaleString(), detail: "current 14-day window" },
                  { label: "High priority", value: (critical + high).toLocaleString(), detail: "critical and high risk", tone: critical + high > 0 ? "critical" : "default" },
                  { label: "Upcoming events", value: timelineEvents.length.toLocaleString(), detail: "non-clear future approaches" },
                ]} />
                <AnalyticsAccordion
                  title="Conjunction volume · screening window"
                  meta={`${conjunctions.total_events} events in current screening window`}
                >
                  <ScreeningVolumeChart buckets={screeningVolume} />
                </AnalyticsAccordion>
                <AnalyticsAccordion title="Miss-distance distribution" meta={`${insideOneKm} events inside 1 km`}>
                  <MissDistanceChart buckets={missDistanceDistribution} />
                </AnalyticsAccordion>
                <div className="grid items-start gap-3.5 min-[1000px]:grid-cols-2">
                  <AnalyticsAccordion title="Objects by type" meta={`${data.total_objects.toLocaleString()} catalogued objects`}>
                    <ObjectClassificationChart categories={objectCategories} />
                  </AnalyticsAccordion>
                  <AnalyticsAccordion title="Operational status" meta={`${activeObjects.toLocaleString()} active · ${unknownStatusObjects.toLocaleString()} unknown`}>
                    <RankedCountChart metrics={operationalStatusMetrics} />
                  </AnalyticsAccordion>
                </div>
                <AnalyticsAccordion title="LEO density by altitude" meta={peakAltitude ? `peak density ${peakAltitude.label} km` : "no orbit data"}>
                  <AltitudeDensityChart buckets={altitudeDensity} />
                </AnalyticsAccordion>
                <div className="grid items-start gap-3.5 min-[1000px]:grid-cols-2">
                  <AnalyticsAccordion title="Top catalog owners" meta={`${data.top_owners.length} owners shown`}>
                    <RankedCountChart metrics={ownerMetrics} />
                  </AnalyticsAccordion>
                  <AnalyticsAccordion title="Risk distribution" meta={`${critical} critical · ${high} high`}>
                    <RiskDistributionChart metrics={riskDistribution} />
                  </AnalyticsAccordion>
                </div>
                <ConjunctionTimeline events={timelineEvents} />
              </>
            );
          })()
        )}
      </main>
    </AppShell>
  );
}
