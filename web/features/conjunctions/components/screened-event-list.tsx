import { ConjunctionRiskBadge } from "./conjunction-risk-badge";
import { Pagination } from "@/components/ui/pagination";
import { formatDistance } from "../formatters";
import type { ConjunctionRiskFilter, ScreenedEventListProps } from "../types";

const filters: { label: string; value: ConjunctionRiskFilter }[] = [
  { label: "ALL", value: "ALL" },
  { label: "CRITICAL", value: "CRITICAL" },
  { label: "HIGH", value: "HIGH" },
  { label: "MEDIUM", value: "MEDIUM" },
  { label: "LOW", value: "LOW" },
];

export function ScreenedEventList({
  events,
  selectedEventId,
  filter,
  counts,
  currentPage,
  totalPages,
  onFilterChange,
  onPageChange,
  onSelect,
}: ScreenedEventListProps) {
  return (
    <section className="screened-events-panel panel-rise border border-[var(--bd)] bg-surface-1 min-[1240px]:sticky min-[1240px]:top-[70px]">
      <header className="flex items-center justify-between border-b border-[var(--bd)] bg-surface-2 px-3.5 py-[11px]">
        <h2 className="text-[12.5px] font-semibold tracking-[-0.006em]">Screened events</h2>
        <span className="numeric text-[9.5px] text-text-tertiary">TCA ±24 h</span>
      </header>
      <div className="risk-filter-grid grid grid-cols-[0.9fr_1.4fr_1fr_1.2fr_0.9fr] gap-1 border-b border-[var(--bd2)] p-2.5">
        {filters.map((item) => {
          const active = filter === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onFilterChange(item.value)}
              className={`numeric h-[27px] min-w-0 whitespace-nowrap border px-1 text-[7px] font-semibold tracking-[0.01em] transition-colors duration-150 ${active ? "border-[var(--acc-border)] bg-[var(--acc-tint)] text-[var(--acc-text)]" : "border-[var(--bd)] text-text-tertiary hover:border-[var(--acc-border)] hover:text-text-primary"}`}
            >
              {item.label} {counts[item.value]}
            </button>
          );
        })}
      </div>
      <div className="max-h-[calc(100vh-176px)] overflow-y-auto">
        {events.map((event) => {
          const selected = event.id === selectedEventId;
          return (
            <button
              key={event.id}
              onClick={() => onSelect(event.id)}
              className={`block w-full border-b border-[var(--bd2)] px-3 py-3 text-left transition-colors duration-120 hover:bg-surface-3 ${selected ? "bg-surface-3 shadow-[inset_2px_0_0_var(--acc)]" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <ConjunctionRiskBadge level={event.risk} />
                <span className="numeric text-[11.5px] font-medium text-text-primary">{event.tcaLabel}</span>
              </div>
              <div className="mt-2 text-[11.5px] font-medium text-text-primary">{event.objectA.name}</div>
              <div className="mt-0.5 truncate text-[11px] text-text-secondary">{event.objectB.name}</div>
              <div className="numeric mt-1.5 text-[10.5px] text-text-tertiary">
                miss <span className="font-medium text-text-secondary">{formatDistance(event.minimumSeparationKm)}</span>
              </div>
            </button>
          );
        })}
        {events.length === 0 ? (
          <div className="px-3.5 py-8 text-center text-[11px] text-text-tertiary">No events at this risk level.</div>
        ) : null}
      </div>
      {events.length > 0 ? (
        <Pagination currentPage={currentPage} totalPages={totalPages} pageSize={10} itemLabel="events" onPageChange={onPageChange} />
      ) : null}
    </section>
  );
}
