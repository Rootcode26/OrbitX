"use client";

import { useCallback, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AlertFeed } from "./alert-feed";
import { CriticalEventCard } from "./critical-event-card";
import { MetricStrip } from "./metric-strip";
import { OrbitalSituation } from "./orbital-situation";
import { UpcomingConjunctions } from "./upcoming-conjunctions";
import { GlossaryDrawer } from "./glossary-drawer";

export function OverviewPage() {
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const closeGlossary = useCallback(() => setGlossaryOpen(false), []);

  return (
    <>
      <AppShell
        title="Overview"
        subtitle="Operational summary · LEO screening volume"
        activePath="/"
        topbarAction={(
          <button onClick={() => setGlossaryOpen(true)} className="h-[30px] border border-[var(--bd)] px-3 text-[9.5px] font-medium text-text-secondary transition-colors duration-140 hover:border-[var(--acc-border)] hover:bg-[var(--acc-tint)] hover:text-[var(--acc-text)]">
            Glossary
          </button>
        )}
      >
        <main className="space-y-3.5 p-4 min-[1240px]:p-5">
          <MetricStrip />
          <div className="grid items-start gap-3.5 min-[1240px]:grid-cols-[minmax(0,1fr)_430px] min-[1500px]:grid-cols-[minmax(0,1fr)_466px]">
            <div className="min-w-0 space-y-3.5">
              <OrbitalSituation />
              <UpcomingConjunctions />
            </div>
            <aside className="space-y-3.5 min-[1240px]:sticky min-[1240px]:top-[70px]">
              <CriticalEventCard />
              <AlertFeed />
            </aside>
          </div>
        </main>
      </AppShell>
      <GlossaryDrawer open={glossaryOpen} onClose={closeGlossary} />
    </>
  );
}
