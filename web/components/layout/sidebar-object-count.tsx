"use client";

import { useOverview } from "@/features/overview/hooks/use-overview";

export function SidebarObjectCount() {
  const overview = useOverview();
  return (
    <span className="numeric">
      {overview.data ? overview.data.tracked_objects.toLocaleString() : "—"}
    </span>
  );
}
