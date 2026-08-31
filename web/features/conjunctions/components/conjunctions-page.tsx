"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useConjunctionEvents } from "../hooks/use-conjunction-events";
import { useConjunctionEvent } from "../hooks/use-conjunction-event";
import { useSatelliteCatalogItem } from "@/features/orbital-objects/hooks/use-satellite-catalog-item";
import type { OrbitalObject } from "@/features/orbital-objects/types";
import { formatLocalDateTime } from "../formatters";
import type {
  ConjunctionEvent,
  ConjunctionEventRecord,
  ConjunctionObject,
  ConjunctionRiskFilter,
  ConjunctionRiskLevel,
  EncounterState,
  EncounterTrackSample,
  SeparationSample,
  Vec3Data,
} from "../types";
import { EncounterGeometry } from "./encounter-geometry";
import { EventAnalysis } from "./event-analysis";
import { EventSummary } from "./event-summary";
import { ScreenedEventList } from "./screened-event-list";
import { SeparationProfile } from "./separation-profile";

const pageSize = 10;

function toConjunctionObject(object: ConjunctionEventRecord["object_a"]): ConjunctionObject {
  return {
    noradCatId: object.norad_cat_id,
    name: object.name,
    objectType: "UNKNOWN",
    status: "UNKNOWN",
    owner: null,
    launchDate: null,
    altitudeKm: null,
    apogeeKm: null,
    perigeeKm: null,
    inclinationDegrees: null,
    raanDegrees: null,
  };
}

function normaliseRiskScore(score: number | null): number {
  return Math.min(10, Math.max(0, (score ?? 0) / 10));
}

function readVec3(value: unknown): Vec3Data | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const { x, y, z } = record;
  if (typeof x === "number" && typeof y === "number" && typeof z === "number") return { x, y, z };
  return null;
}

function toTcaState(raw: Record<string, unknown>): EncounterState | null {
  const objectA = raw.satellite_a as Record<string, unknown> | undefined;
  const objectB = raw.satellite_b as Record<string, unknown> | undefined;
  const positionA = readVec3(objectA?.position_at_tca_km);
  const velocityA = readVec3(objectA?.velocity_at_tca_km_s);
  const positionB = readVec3(objectB?.position_at_tca_km);
  const velocityB = readVec3(objectB?.velocity_at_tca_km_s);
  if (!positionA || !velocityA || !positionB || !velocityB) return null;
  return {
    a: { positionKm: positionA, velocityKmS: velocityA },
    b: { positionKm: positionB, velocityKmS: velocityB },
  };
}

function toEncounterTrack(raw: Record<string, unknown>): EncounterTrackSample[] | null {
  const track = raw.encounter_track;
  if (!Array.isArray(track)) return null;
  const samples = track.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const value = entry as Record<string, unknown>;
    const positionAKm = readVec3(value.position_a_km);
    const positionBKm = readVec3(value.position_b_km);
    const offsetSeconds = typeof value.offset_seconds === "number" ? value.offset_seconds : null;
    const separationKm = typeof value.separation_km === "number" ? value.separation_km : null;
    if (!positionAKm || !positionBKm || offsetSeconds === null || separationKm === null) return [];
    return [{ offsetSeconds, positionAKm, positionBKm, separationKm }];
  });
  return samples.length > 1 ? samples : null;
}

function toSeparationSamples(profile: unknown[] | null): SeparationSample[] {
  return (profile ?? []).flatMap((sample) => {
    if (!sample || typeof sample !== "object" || Array.isArray(sample)) return [];
    const value = sample as Record<string, unknown>;
    const timestamp = typeof value.timestamp === "string"
      ? value.timestamp
      : typeof value.timestamp_utc === "string" ? value.timestamp_utc : null;
    const separationKm = typeof value.separation_km === "number" ? value.separation_km : null;
    const closingRateKmS = typeof value.closing_rate_km_s === "number" ? value.closing_rate_km_s : null;
    return timestamp && separationKm !== null ? [{ timestamp, separationKm, closingRateKmS }] : [];
  });
}

function mergeObject(base: ConjunctionObject, item: OrbitalObject | undefined): ConjunctionObject {
  if (!item) return base;
  return {
    ...base,
    objectType: item.objectType,
    status: item.status,
    owner: item.owner,
    launchDate: item.launchDate,
    altitudeKm: item.altitudeKm,
    apogeeKm: item.apogeeKm,
    perigeeKm: item.perigeeKm,
    inclinationDegrees: item.inclinationDegrees,
    raanDegrees: item.raanDegrees,
  };
}

function toConjunctionEvent(record: ConjunctionEventRecord): ConjunctionEvent {
  const risk = record.risk_level as ConjunctionRiskLevel;
  const tcaIso = record.tca;
  const separationProfile = toSeparationSamples(record.separation_profile);
  const maximumSeparation = separationProfile.reduce((maximum, sample) => Math.max(maximum, sample.separationKm), 0);
  return {
    id: record.id,
    objectA: toConjunctionObject(record.object_a),
    objectB: toConjunctionObject(record.object_b),
    risk,
    tcaIso,
    tcaLabel: tcaIso ? formatLocalDateTime(tcaIso) : "TCA unavailable",
    computedAt: record.computed_at,
    minimumSeparationKm: record.minimum_separation_km,
    relativeVelocityKmS: record.relative_velocity_km_s,
    encounterAngleDegrees: record.encounter_angle_degrees,
    riskScore: normaliseRiskScore(record.risk_score),
    screeningWindowHours: Math.round(record.screening_duration_minutes / 60),
    profileSpanKm: Math.round(maximumSeparation),
    radialUncertaintyM: record.radial_uncertainty_m,
    separationProfile,
    tcaState: toTcaState(record.raw_result),
    encounterTrack: toEncounterTrack(record.raw_result),
  };
}

export function ConjunctionsPage() {
  const eventsQuery = useConjunctionEvents({ limit: 50, upcoming: true });
  const [riskFilter, setRiskFilter] = useState<ConjunctionRiskFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("event");
  });
  const [trackedIds, setTrackedIds] = useState<Set<number>>(new Set());

  function toggleTracked(noradCatId: number) {
    setTrackedIds((current) => {
      const next = new Set(current);
      if (next.has(noradCatId)) next.delete(noradCatId);
      else next.add(noradCatId);
      return next;
    });
  }

  const events = useMemo(
    () => (eventsQuery.data?.events ?? [])
      .filter((event) => event.risk_level !== "CLEAR")
      .map(toConjunctionEvent),
    [eventsQuery.data],
  );

  const filteredEvents = useMemo(
    () => (riskFilter === "ALL" ? events : events.filter((event) => event.risk === riskFilter)),
    [events, riskFilter],
  );

  const counts = useMemo(() => ({
    ALL: events.length,
    CRITICAL: events.filter((event) => event.risk === "CRITICAL").length,
    HIGH: events.filter((event) => event.risk === "HIGH").length,
    MEDIUM: events.filter((event) => event.risk === "MEDIUM").length,
    LOW: events.filter((event) => event.risk === "LOW").length,
  }), [events]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const selectedEventIndex = selectedEventId
    ? filteredEvents.findIndex((event) => event.id === selectedEventId)
    : -1;
  const selectedEventPage = selectedEventIndex >= 0
    ? Math.floor(selectedEventIndex / pageSize) + 1
    : currentPage;
  const visiblePage = Math.min(selectedEventPage, totalPages);
  const paginatedEvents = filteredEvents.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);

  const selectedListEvent = selectedEventId
    ? events.find((event) => event.id === selectedEventId) ?? null
    : paginatedEvents[0] ?? null;
  const eventDetail = useConjunctionEvent(selectedEventId ?? selectedListEvent?.id ?? null);
  const selectedEvent = eventDetail.data ? toConjunctionEvent(eventDetail.data) : selectedListEvent;

  const detailA = useSatelliteCatalogItem(selectedEvent?.objectA.noradCatId ?? null);
  const detailB = useSatelliteCatalogItem(selectedEvent?.objectB.noradCatId ?? null);

  const enrichedEvent = useMemo(() => {
    if (!selectedEvent) return null;
    return {
      ...selectedEvent,
      objectA: mergeObject(selectedEvent.objectA, detailA.data),
      objectB: mergeObject(selectedEvent.objectB, detailB.data),
    };
  }, [selectedEvent, detailA.data, detailB.data]);

  function updateFilter(filter: ConjunctionRiskFilter) {
    setRiskFilter(filter);
    setCurrentPage(1);
    const firstMatchingEvent = filter === "ALL"
      ? events[0]
      : events.find((event) => event.risk === filter);
    setSelectedEventId(firstMatchingEvent?.id ?? null);
  }

  function updatePage(page: number) {
    setCurrentPage(page);
    const firstEvent = filteredEvents[(page - 1) * pageSize];
    setSelectedEventId(firstEvent?.id ?? null);
  }

  return (
    <AppShell
      title="Conjunctions"
      subtitle="Close-approach screening · 7 d horizon · ≤ 500 km miss distance"
      activePath="/conjunctions"
    >
      {eventsQuery.isPending || (selectedEventId !== null && eventDetail.isPending) ? (
        <main className="grid items-start gap-3.5 p-4 min-[1240px]:grid-cols-[340px_minmax(0,1fr)] min-[1240px]:p-5 min-[1500px]:grid-cols-[360px_minmax(0,1fr)]">
          <Skeleton className="h-[520px] w-full" />
          <div className="space-y-3.5">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      ) : eventsQuery.isError ? (
        <main className="p-4 min-[1240px]:p-5">
          <EmptyState
            tone="error"
            title="Unable to load conjunction events"
            description="The conjunction screening service could not be reached. Check that the backend is running."
          />
        </main>
      ) : !enrichedEvent ? (
        <main className="p-4 min-[1240px]:p-5">
          <EmptyState
            title="No conjunction events"
            description="No screened conjunction events are currently on record."
          />
        </main>
      ) : (
        <main className="grid items-start gap-3.5 p-4 min-[1240px]:grid-cols-[340px_minmax(0,1fr)] min-[1240px]:p-5 min-[1500px]:grid-cols-[360px_minmax(0,1fr)]">
          <ScreenedEventList
            events={paginatedEvents}
            selectedEventId={enrichedEvent.id}
            filter={riskFilter}
            counts={counts}
            currentPage={visiblePage}
            totalPages={totalPages}
            onFilterChange={updateFilter}
            onPageChange={updatePage}
            onSelect={(eventId) => {
              setCurrentPage(visiblePage);
              setSelectedEventId(eventId);
            }}
          />
          <div className="min-w-0 space-y-3.5">
            <EventSummary event={enrichedEvent} trackedIds={trackedIds} onToggleTrack={toggleTracked} />
            <div className="grid items-start gap-3.5 min-[1000px]:grid-cols-[minmax(280px,0.75fr)_minmax(420px,1.25fr)]">
              <EventAnalysis event={enrichedEvent} />
              <SeparationProfile event={enrichedEvent} />
            </div>
            <EncounterGeometry key={enrichedEvent.id} event={enrichedEvent} />
          </div>
        </main>
      )}
    </AppShell>
  );
}
