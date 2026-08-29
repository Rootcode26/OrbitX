"use client";

import { useState } from "react";
import type { AnalyticsAccordionProps } from "../types";

export function AnalyticsAccordion({
  title,
  meta,
  children,
  initiallyOpen = true,
}: AnalyticsAccordionProps) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <section className="panel-rise border border-[var(--bd)] bg-surface-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-4 border-b border-[var(--bd)] bg-surface-2 px-3.5 py-[11px] text-left transition-colors duration-150 hover:bg-surface-3"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className={`text-[15px] leading-none text-text-secondary transition-transform duration-180 ${open ? "rotate-0" : "-rotate-90"}`}>⌄</span>
          <span className="text-[12.5px] font-semibold tracking-[-0.006em] text-text-primary">{title}</span>
        </span>
        <span className="numeric truncate text-[10px] text-text-tertiary">{meta}</span>
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(.4,0,.2,1)] ${open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">{children}</div>
      </div>
    </section>
  );
}

