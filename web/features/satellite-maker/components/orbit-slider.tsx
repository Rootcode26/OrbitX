"use client";

import { useState } from "react";
import type { OrbitSliderProps } from "../types";

function formatValue(value: number, step: number) {
  return Number.isInteger(step) ? value.toFixed(0) : value.toFixed(1);
}

export function OrbitSlider({
  label,
  value,
  minimum,
  maximum,
  step,
  unit,
  onChange,
}: OrbitSliderProps) {
  // While editing, the field holds the raw typed text; otherwise it mirrors the
  // live slider value directly, so no effect-based syncing is needed.
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      onChange(Math.min(maximum, Math.max(minimum, parsed)));
    }
    setEditing(false);
  };

  return (
    <div className="grid min-h-[43px] grid-cols-[140px_minmax(0,1fr)_142px] items-center gap-3 border-t border-[var(--bd2)] px-3.5">
      <span className="text-[10.5px] font-medium text-text-secondary">{label}</span>
      <input
        type="range"
        min={minimum}
        max={maximum}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full cursor-pointer accent-[var(--acc)]"
      />
      <div className="flex items-center justify-end gap-1.5">
        <input
          type="number"
          min={minimum}
          max={maximum}
          step={step}
          value={editing ? draft : formatValue(value, step)}
          onFocus={() => {
            setEditing(true);
            setDraft(String(value));
          }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="numeric h-6 w-[86px] border border-[var(--bd)] bg-field px-2 py-0 text-right text-[10.5px] font-medium text-text-primary outline-none transition-colors focus:border-[var(--acc-border)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-[10px] text-text-tertiary">{unit}</span>
      </div>
    </div>
  );
}
