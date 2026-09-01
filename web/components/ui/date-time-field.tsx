"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { Icon } from "./icon";

interface DateTimeFieldProps {
  label: string;
  // Local datetime string in the datetime-local format, e.g. "2026-08-27T15:00".
  value: string;
  onChange: (value: string) => void;
}

const pad = (value: number) => String(value).padStart(2, "0");

function parseLocal(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

function formatLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function DateTimeField({ label, value, onChange }: DateTimeFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = parseLocal(value);
  const timeValue = selected ? `${pad(selected.getHours())}:${pad(selected.getMinutes())}` : "";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleDaySelect(day: Date | undefined) {
    if (!day) return;
    const base = selected ?? new Date();
    onChange(formatLocal(new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      base.getHours(),
      base.getMinutes(),
    )));
  }

  function handleTimeChange(next: string) {
    const match = /^(\d{2}):(\d{2})$/.exec(next);
    if (!match) return;
    const base = selected ?? new Date();
    onChange(formatLocal(new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      Number(match[1]),
      Number(match[2]),
    )));
  }

  return (
    <div ref={containerRef} className="block px-3.5 py-3">
      <span className="text-[10px] font-medium text-text-tertiary">{label}</span>
      <div className="relative mt-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={`numeric flex h-9 w-full items-center justify-between border bg-field px-3 text-left text-[10.5px] outline-none transition-colors ${open ? "border-[var(--acc-border)]" : "border-[var(--bd)] hover:border-[var(--acc-border)]"}`}
        >
          <span className={selected ? "text-text-primary" : "text-text-tertiary"}>
            {selected ? `${dateFormatter.format(selected)} · ${timeValue}` : "Select date & time"}
          </span>
          <Icon name="calendar" className="h-3.5 w-3.5 text-text-tertiary" />
        </button>

        {open ? (
          <div
            role="dialog"
            aria-label={label}
            className="absolute left-0 top-full z-30 mt-1.5 w-[264px] border border-[var(--bd)] bg-surface-2 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.55)]"
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleDaySelect}
              defaultMonth={selected}
              showOutsideDays
              weekStartsOn={1}
              className="dtf-calendar"
              components={{
                Chevron: ({ orientation }) => (
                  <Icon
                    name={orientation === "left" ? "chevron-left" : "chevron-right"}
                    className="h-3.5 w-3.5"
                  />
                ),
              }}
            />
            <label className="mt-2 flex items-center justify-between border-t border-[var(--bd2)] pt-2.5">
              <span className="text-[9px] font-medium uppercase tracking-wide text-text-tertiary">
                Time · local
              </span>
              <input
                type="time"
                value={timeValue}
                onChange={(event) => handleTimeChange(event.target.value)}
                className="numeric h-7 border border-[var(--bd)] bg-field px-2 text-[10.5px] text-text-primary outline-none focus:border-[var(--acc-border)] [color-scheme:dark]"
              />
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
