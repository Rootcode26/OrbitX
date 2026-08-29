"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { FinderObject, FinderObjectClass } from "../types";

interface ComparisonSetProps {
  catalog: FinderObject[];
  objects: FinderObject[];
  primaryId: number | null;
  onAdd: (objectId: number) => void;
  onSetPrimary: (objectId: number) => void;
  onRemove: (objectId: number) => void;
  onClear: () => void;
}

const classColor: Record<FinderObjectClass, string> = {
  active: "bg-[var(--object-active)]",
  inactive: "bg-[var(--object-inactive)]",
  debris: "bg-[var(--object-debris)]",
  rocket: "bg-[var(--object-rocket)]",
};

export function ComparisonSet({ catalog, objects, primaryId, onAdd, onSetPrimary, onRemove, onClear }: ComparisonSetProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const availableObjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return catalog.filter((object) => (
      !objects.some(({ noradCatId }) => noradCatId === object.noradCatId) &&
      (!normalizedQuery || object.name.toLowerCase().includes(normalizedQuery) || String(object.noradCatId).includes(normalizedQuery))
    ))
      .sort((a, b) => Number(b.isUserCreated ?? false) - Number(a.isUserCreated ?? false))
      .slice(0, 100);
  }, [catalog, objects, query]);
  const atLimit = objects.length >= 10;

  function addObject(objectId: number) {
    if (atLimit) return;
    onAdd(objectId);
    setQuery("");
    setFocused(false);
  }

  return (
    <aside className="border border-[var(--bd)] bg-surface-1">
      <header className="flex min-h-10 items-center justify-between border-b border-[var(--bd)] bg-surface-2 px-3.5 py-[11px]">
        <h2 className="text-[12.5px] leading-none font-semibold text-text-primary">Comparison set</h2>
        <button onClick={onClear} disabled={!objects.length} className="text-[11px] text-text-tertiary transition-colors duration-120 hover:text-text-primary disabled:opacity-35">
          Clear
        </button>
      </header>

      <div className="relative border-b border-[var(--bd)] p-3">
        <label className="flex h-9 items-center gap-2 border border-[var(--bd)] bg-field px-3 focus-within:border-[var(--acc-border)]">
          <Icon name="search" className="h-3.5 w-3.5 text-text-tertiary" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && availableObjects[0]) addObject(availableObjects[0].noradCatId);
              if (event.key === "Escape") setFocused(false);
            }}
            placeholder={atLimit ? "Comparison set is full" : "Add satellite by name or NORAD ID…"}
            disabled={atLimit}
            className="min-w-0 flex-1 bg-transparent text-[11.5px] text-text-primary outline-none placeholder:text-text-tertiary disabled:opacity-50"
          />
        </label>
        {focused && !atLimit && availableObjects.length ? (
          <div className="absolute right-3 left-3 z-20 max-h-[280px] overflow-y-auto border border-[var(--bd)] bg-surface-2">
            {availableObjects.map((object) => (
              <button key={object.noradCatId} onMouseDown={(event) => event.preventDefault()} onClick={() => addObject(object.noradCatId)} className="flex w-full items-center justify-between border-b border-[var(--bd2)] px-3 py-2 text-left last:border-b-0 hover:bg-surface-3">
                <span className="flex min-w-0 items-center gap-2">
                  <i className={`h-1.5 w-1.5 shrink-0 ${classColor[object.objectClass]}`} />
                  <span className="truncate text-[11px] font-medium text-text-primary">{object.name}</span>
                  {object.isUserCreated ? <YoursBadge /> : null}
                </span>
                <span className="numeric ml-2 text-[9px] text-text-tertiary">{object.noradCatId}</span>
              </button>
            ))}
          </div>
        ) : null}
        {atLimit ? <p className="mt-2 text-[9.5px] text-text-tertiary">Remove an object before adding another.</p> : null}
      </div>

      {objects.length ? (
        <p className="border-b border-[var(--bd2)] px-3.5 py-2 text-[9.5px] leading-relaxed text-text-tertiary">
          Select a <span className="text-[var(--acc-text)]">reference</span> satellite — every other object is compared with respect to it.
        </p>
      ) : null}

      <div>
        {objects.map((object) => {
          const isPrimary = object.noradCatId === primaryId;
          return (
          <article key={object.noradCatId} className={`border-b border-[var(--bd2)] px-3.5 py-3 last:border-b-0 ${isPrimary ? "bg-[var(--acc-tint)] shadow-[inset_2px_0_0_var(--acc)]" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={isPrimary}
                  aria-label={isPrimary ? `${object.name} is the reference satellite` : `Set ${object.name} as the reference satellite`}
                  onClick={() => onSetPrimary(object.noradCatId)}
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors duration-120 ${isPrimary ? "border-[var(--acc)]" : "border-[var(--bd)] hover:border-[var(--acc-border)]"}`}
                >
                  {isPrimary ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--acc)]" /> : null}
                </button>
                <i className={`h-1.5 w-1.5 shrink-0 ${classColor[object.objectClass]}`} />
                <h3 className="truncate text-[11.5px] font-semibold text-text-primary">{object.name}</h3>
                {isPrimary ? <ReferenceBadge /> : null}
                {object.isUserCreated ? <YoursBadge /> : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="numeric text-[8.5px] text-text-tertiary">{object.noradCatId}</span>
                <button aria-label={`Remove ${object.name}`} onClick={() => onRemove(object.noradCatId)} className="text-[13px] leading-none text-text-tertiary hover:text-text-primary">×</button>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-4 gap-2">
              <Metric label="Alt km" value={object.altitudeKm.toFixed(1)} />
              <Metric label="Incl" value={object.inclinationDegrees.toFixed(2)} />
              <Metric label="Vel" value={object.velocityKmS.toFixed(3)} />
              <Metric label="Period" value={object.orbitalPeriodMinutes.toFixed(1)} />
            </dl>
          </article>
          );
        })}
        {!objects.length ? <p className="px-3.5 py-8 text-center text-[10.5px] text-text-tertiary">Add at least two objects to compare their propagated states.</p> : null}
      </div>
    </aside>
  );
}

function ReferenceBadge() {
  return (
    <span className="shrink-0 border border-[var(--acc-border)] bg-[var(--acc-tint)] px-1.5 py-[1px] text-[8px] font-semibold uppercase tracking-wide text-[var(--acc-text)]">
      Reference
    </span>
  );
}

function YoursBadge() {
  return (
    <span className="shrink-0 border border-[var(--acc-border)] bg-[var(--acc-tint)] px-1.5 py-[1px] text-[8px] font-semibold uppercase tracking-wide text-[var(--acc-text)]">
      Yours
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[9px] text-text-tertiary">{label}</dt>
      <dd className="numeric mt-1 text-[10.5px] font-medium text-text-primary">{value}</dd>
    </div>
  );
}
