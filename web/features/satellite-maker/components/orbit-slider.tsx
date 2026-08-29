import type { OrbitSliderProps } from "../types";

export function OrbitSlider({
  label,
  value,
  minimum,
  maximum,
  step,
  unit,
  onChange,
}: OrbitSliderProps) {
  return (
    <label className="grid min-h-[43px] grid-cols-[140px_minmax(0,1fr)_92px] items-center gap-3 border-t border-[var(--bd2)] px-3.5">
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
      <span className="numeric text-right text-[11px] font-medium text-text-primary">
        {Number.isInteger(step) ? value.toFixed(0) : value.toFixed(1)} {unit}
      </span>
    </label>
  );
}

