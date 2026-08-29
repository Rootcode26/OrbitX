import { Panel } from "@/components/ui/panel";
import { OrbitalGlobe } from "@/features/globe/components/orbital-globe";
import type { GlobeObject } from "@/features/globe/types";

export function OrbitPreview({ object }: { object?: GlobeObject }) {
  return (
    <Panel title="Orbit preview" meta="local Kepler preview">
      <OrbitalGlobe compact featuredObject={object} />
    </Panel>
  );
}
