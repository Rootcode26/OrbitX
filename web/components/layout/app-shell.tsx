"use client";

import { AppSidebar } from "./app-sidebar";
import { Topbar } from "./topbar";
import type { AppShellProps } from "./types";
import { useOverview } from "@/features/overview/hooks/use-overview";

export function AppShell({
  children,
  title,
  subtitle,
  activePath,
  unacknowledgedAlerts,
  topbarAction,
}: AppShellProps) {
  const overview = useOverview();
  const alertCount = unacknowledgedAlerts ?? overview.data?.unacknowledged_alerts ?? 0;
  const conjunctionCount = overview.data?.upcoming_conjunctions ?? 0;

  return (
    <div className="grid min-h-screen grid-cols-[176px_minmax(0,1fr)] bg-background min-[1240px]:grid-cols-[216px_minmax(0,1fr)]">
      <AppSidebar activePath={activePath} unacknowledgedAlerts={alertCount} conjunctionCount={conjunctionCount} />
      <div className="min-w-0">
        <Topbar
          title={title}
          subtitle={subtitle}
          action={topbarAction}
        />
        {children}
      </div>
    </div>
  );
}
