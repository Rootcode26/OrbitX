import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { navigationItems } from "@/features/navigation/data";
import { SidebarObjectCount } from "./sidebar-object-count";

export function AppSidebar({
  activePath,
  unacknowledgedAlerts,
  conjunctionCount,
}: {
  activePath: string;
  unacknowledgedAlerts: number;
  conjunctionCount: number;
}) {
  return (
    <aside className="sticky top-0 flex h-screen min-h-[680px] flex-col border-r border-[var(--bd)] bg-[var(--nav)]">
      <div className="flex h-[56px] items-center gap-2.5 border-b border-[var(--bd)] px-3.5 min-[1240px]:px-[18px]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--acc-border)] text-accent">
          <Icon name="orbit" className="h-[18px] w-[18px]" />
        </div>
        <div>
          <div className="text-[12.5px] leading-tight font-semibold tracking-[-0.012em] text-white">ORBITX</div>
          <div className="text-[10px] leading-tight text-[#B3B0A9]">SSA Operations</div>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 py-3">
        {navigationItems.map((item) => {
          const isActive = item.href === activePath;
          return (
          <Link
            key={item.label}
            href={item.href}
            className={`group relative mx-2 flex h-[31px] items-center gap-2.5 px-2.5 text-[12.5px] leading-none font-medium tracking-[-0.008em] transition-colors duration-120 ${
              isActive
                ? "bg-[rgba(143,175,196,.10)] text-white before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent"
                : "text-white hover:bg-surface-2 hover:text-white"
            }`}
          >
            <Icon name={item.icon} className={`h-[15px] w-[15px] shrink-0 transition-colors duration-120 ${isActive ? "text-[var(--acc-text)]" : "text-white group-hover:text-[var(--acc-text)]"}`} />
            <span className="truncate text-white">{item.label}</span>
            {item.count ? (
              <span className="numeric ml-auto bg-[rgba(228,222,208,.06)] px-1.5 py-1 text-[9px] text-[#C0BCB4]">
                {item.href === "/alerts" ? unacknowledgedAlerts : item.href === "/conjunctions" ? conjunctionCount : item.count}
              </span>
            ) : null}
          </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--bd)] px-3.5 py-3.5 text-[10px] leading-[1.8] text-[#AAA79F] min-[1240px]:px-[18px]">
        <div className="flex justify-between">
          <span>Propagator</span>
          <span className="numeric flex items-center gap-1.5 text-nominal">
            <span className="status-pulse h-1.5 w-1.5 bg-nominal" />
            SGP4
          </span>
        </div>
        <div className="flex justify-between">
          <span>screening</span>
          <span className="numeric">on demand</span>
        </div>
        <div className="flex justify-between">
          <span>objects</span>
          <SidebarObjectCount />
        </div>
      </div>
    </aside>
  );
}
