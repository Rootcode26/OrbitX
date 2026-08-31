"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { CurrentSatelliteStateApiRecord } from "@/features/live-tracking/types";
import type { OrbitalObject } from "@/features/orbital-objects/types";

export function ReferenceSelector({
  query,
  onQueryChange,
  options,
  selectedId,
  primary,
  onSelect,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  options: OrbitalObject[];
  selectedId: number | null;
  primary: CurrentSatelliteStateApiRecord | null;
  onSelect: (object: OrbitalObject) => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <aside className="border border-[var(--bd)] bg-surface-1">
      <header className="border-b border-[var(--bd)] bg-surface-2 px-3.5 py-[11px]">
        <h2 className="text-[12.5px] font-semibold text-text-primary">Reference satellite</h2>
        <p className="mt-1 text-[9.5px] text-text-tertiary">Search by name or NORAD ID</p>
      </header>
      <div className="relative border-b border-[var(--bd)] p-3">
        <label className="flex h-9 items-center gap-2 border border-[var(--bd)] bg-field px-3 focus-within:border-[var(--acc-border)]">
          <Icon name="search" className="h-3.5 w-3.5 text-text-tertiary" />
          <input
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setFocused(true);
            }}
            onFocus={() => setFocused(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && options[0]) onSelect(options[0]);
              if (event.key === "Escape") setFocused(false);
            }}
            placeholder="Select satellite by name or NORAD ID…"
            className="min-w-0 flex-1 bg-transparent text-[11.5px] text-text-primary outline-none placeholder:text-text-tertiary"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="text-[10px] text-text-tertiary hover:text-text-primary"
            >
              Clear
            </button>
          ) : null}
        </label>
        {focused && options.length > 0 ? (
          <div className="absolute right-3 left-3 z-20 max-h-[300px] overflow-y-auto border border-[var(--bd)] bg-surface-2 shadow-lg">
            {options.map((object) => (
              <button
                key={object.noradCatId}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(object);
                  setFocused(false);
                }}
                className={`flex w-full items-center justify-between gap-3 border-b border-[var(--bd2)] px-3 py-2 text-left last:border-b-0 hover:bg-surface-3 ${object.noradCatId === selectedId ? "bg-[var(--acc-tint)]" : ""}`}
              >
                <span className="truncate text-[11px] font-medium text-text-primary">{object.name}</span>
                <span className="numeric shrink-0 text-[9px] text-text-tertiary">{object.noradCatId}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {primary ? (
        <dl className="grid grid-cols-2">
          <ReferenceField label="Name" value={primary.name} />
          <ReferenceField label="NORAD ID" value={String(primary.norad_cat_id)} />
          <ReferenceField label="Altitude" value={`${primary.height_km.toFixed(1)} km`} />
          <ReferenceField label="Inclination" value={`${primary.inclination_degrees.toFixed(2)}°`} />
          <ReferenceField label="Speed" value={`${primary.speed_km_s.toFixed(3)} km/s`} />
          <ReferenceField label="Owner" value={primary.owner ?? "Unknown"} />
        </dl>
      ) : (
        <p className="px-3.5 py-8 text-center text-[10.5px] leading-relaxed text-text-tertiary">
          Select one satellite to scan stored current states within 1,000 km.
        </p>
      )}
    </aside>
  );
}

function ReferenceField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-b border-[var(--bd2)] px-3.5 py-3 even:border-r-0">
      <dt className="text-[9px] text-text-tertiary">{label}</dt>
      <dd className="numeric mt-1 truncate text-[10.5px] font-medium text-text-primary">{value}</dd>
    </div>
  );
}
