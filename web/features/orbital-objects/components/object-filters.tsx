import { Icon } from "@/components/ui/icon";
import type {
  CatalogSortKey,
  CatalogStatusFilter,
  CatalogTypeFilter,
  ObjectFiltersProps,
} from "../types";

const typeOptions: { label: string; value: CatalogTypeFilter }[] = [
  { label: "All types", value: "ALL" },
  { label: "Payloads", value: "PAYLOAD" },
  { label: "Rocket bodies", value: "ROCKET BODY" },
  { label: "Debris", value: "DEBRIS" },
];

const statusOptions: { label: string; value: CatalogStatusFilter }[] = [
  { label: "Any", value: "ANY" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

const sortOptions: { label: string; value: CatalogSortKey }[] = [
  { label: "Name", value: "name" },
  { label: "Altitude", value: "altitude" },
  { label: "Incl", value: "inclination" },
  { label: "Velocity", value: "velocity" },
];

function FilterButton<T extends string>({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: T;
  selected: T;
  onSelect: (value: T) => void;
}) {
  const active = value === selected;
  return (
    <button
      onClick={() => onSelect(value)}
      className={`h-[30px] border px-2.5 text-[10.5px] font-medium transition-colors duration-150 ${active ? "border-[var(--acc-border)] bg-[var(--acc-tint)] text-[var(--acc-text)]" : "border-[var(--bd)] text-text-secondary hover:border-[var(--acc-border)] hover:text-text-primary"}`}
    >
      {label}
    </button>
  );
}

export function ObjectFilters({
  filters,
  sortKey,
  owners,
  onFiltersChange,
  onSortChange,
  onReset,
}: ObjectFiltersProps) {
  return (
    <section className="panel-rise border border-[var(--bd)] bg-surface-1 p-3.5">
      <div className="flex gap-3">
        <label className="flex h-9 min-w-[280px] flex-1 items-center gap-2.5 border border-[var(--bd)] bg-field px-3 text-text-tertiary focus-within:border-[var(--acc-border)]">
          <Icon name="search" className="h-3.5 w-3.5 shrink-0" />
          <input
            value={filters.search}
            onChange={(event) => onFiltersChange({ search: event.target.value })}
            placeholder="Search object name or NORAD ID..."
            className="h-full min-w-0 flex-1 bg-transparent text-[11.5px] text-text-primary outline-none placeholder:text-text-tertiary"
          />
          {filters.search ? (
            <button onClick={() => onFiltersChange({ search: "" })} className="text-[10.5px] text-text-secondary hover:text-text-primary">Clear</button>
          ) : null}
        </label>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="mr-1 text-[10.5px] text-text-tertiary">Sort</span>
          {sortOptions.map((option) => (
            <FilterButton key={option.value} label={option.label} value={option.value} selected={sortKey} onSelect={onSortChange} />
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-[10.5px] text-text-tertiary">Type</span>
          {typeOptions.map((option) => (
            <FilterButton<CatalogTypeFilter> key={option.value} label={option.label} value={option.value} selected={filters.objectType} onSelect={(objectType) => onFiltersChange({ objectType })} />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-[10.5px] text-text-tertiary">Status</span>
          {statusOptions.map((option) => (
            <FilterButton<CatalogStatusFilter> key={option.value} label={option.label} value={option.value} selected={filters.status} onSelect={(status) => onFiltersChange({ status })} />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-5">
        <label className="flex items-center gap-2">
          <span className="text-[10.5px] text-text-tertiary">Country</span>
          <select
            value={filters.owner}
            onChange={(event) => onFiltersChange({ owner: event.target.value })}
            className="h-[30px] min-w-[88px] border border-[var(--bd)] bg-field px-2.5 text-[10.5px] text-text-primary outline-none focus:border-[var(--acc-border)]"
          >
            <option value="ALL">All</option>
            {owners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
          </select>
        </label>

        <div className="flex min-w-[360px] flex-1 items-center gap-3">
          <span className="text-[10.5px] text-text-tertiary">Altitude</span>
          <input
            aria-label="Minimum altitude"
            type="range"
            min="300"
            max="1500"
            step="25"
            value={filters.minimumAltitude}
            onChange={(event) => onFiltersChange({ minimumAltitude: Math.min(Number(event.target.value), filters.maximumAltitude) })}
            className="h-1 min-w-0 flex-1 cursor-pointer accent-[var(--acc)]"
          />
          <input
            aria-label="Maximum altitude"
            type="range"
            min="300"
            max="1500"
            step="25"
            value={filters.maximumAltitude}
            onChange={(event) => onFiltersChange({ maximumAltitude: Math.max(Number(event.target.value), filters.minimumAltitude) })}
            className="h-1 min-w-0 flex-1 cursor-pointer accent-[var(--acc)]"
          />
          <span className="numeric whitespace-nowrap text-[9.5px] text-text-tertiary">
            {filters.minimumAltitude} – {filters.maximumAltitude} km
          </span>
        </div>
        <button onClick={onReset} className="text-[10.5px] font-medium text-accent hover:text-[var(--acc-hover)]">Reset</button>
      </div>
    </section>
  );
}
