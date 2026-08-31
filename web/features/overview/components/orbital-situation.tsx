"use client";

import { useMemo } from "react";
import { Panel } from "@/components/ui/panel";
import { OrbitalGlobe } from "@/features/globe/components/orbital-globe";
import { selectBalancedGlobeObjects } from "@/features/globe/select-globe-objects";
import { useOverview } from "../hooks/use-overview";
import { useCurrentSatelliteStates } from "@/features/live-tracking/hooks/use-current-satellite-states";

export function OrbitalSituation() {
  const overview = useOverview();
  const states = useCurrentSatelliteStates(100);
  const objects = useMemo(
    () => selectBalancedGlobeObjects((states.data ?? []).map((state) => state.globeObject), 100, 100),
    [states.data],
  );

  return (
    <Panel
      title="Orbital situation · inertial frame"
      meta={<span className="numeric">{overview.data?.propagated_objects ?? objects.length} objects propagated · TEME</span>}
    >
      <OrbitalGlobe objects={objects} />
    </Panel>
  );
}
