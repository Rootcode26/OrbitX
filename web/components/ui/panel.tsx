import type { PanelProps } from "./types";

export function Panel({ title, meta, className = "", children }: PanelProps) {
  return (
    <section className={`panel-rise border border-[var(--bd)] bg-surface-1 ${className}`}>
      <header className="flex min-h-10 items-center justify-between border-b border-[var(--bd)] bg-surface-2 px-3.5 py-[11px]">
        <h2 className="text-[12.5px] leading-none font-semibold tracking-[-0.006em] text-text-primary">
          {title}
        </h2>
        {meta ? <div className="text-[10.5px] text-text-tertiary">{meta}</div> : null}
      </header>
      {children}
    </section>
  );
}
