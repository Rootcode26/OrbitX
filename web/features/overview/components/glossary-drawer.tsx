"use client";

import { useEffect } from "react";
import { glossaryGroups } from "../data";

interface GlossaryDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function GlossaryDrawer({ open, onClose }: GlossaryDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div aria-hidden={!open} className={`fixed inset-0 z-50 transition-opacity duration-180 ease-[cubic-bezier(.4,0,.2,1)] ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
      <button aria-label="Close glossary" onClick={onClose} tabIndex={open ? 0 : -1} className="absolute inset-0 bg-[rgba(0,0,0,.56)]" />
      <aside role="dialog" aria-modal="true" aria-label="Space situational awareness glossary" className={`absolute top-0 right-0 flex h-full w-[min(620px,calc(100vw-64px))] flex-col border-l border-[var(--bd)] bg-surface-1 transition-transform duration-180 ease-[cubic-bezier(.4,0,.2,1)] ${open ? "translate-x-0" : "translate-x-full"}`}>
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--bd)] bg-surface-2 px-5 py-4">
          <div>
            <p className="numeric text-[9px] font-semibold tracking-[0.07em] text-text-tertiary">GLOSSARY · 26 TERMS</p>
            <h2 className="mt-2 text-[15px] font-semibold tracking-[-0.012em] text-text-primary">Spaceflight terms in plain language</h2>
          </div>
          <button onClick={onClose} tabIndex={open ? 0 : -1} className="flex h-8 w-8 items-center justify-center border border-[var(--bd)] text-[18px] text-text-tertiary transition-colors duration-140 hover:border-[var(--acc-border)] hover:text-text-primary">×</button>
        </header>
        <p className="shrink-0 border-b border-[var(--bd2)] px-5 py-4 text-[11.5px] leading-relaxed text-text-secondary">
          Definitions for the orbital, conjunction and tracking language used throughout OrbitX.
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {glossaryGroups.map((group) => (
            <section key={group.title}>
              <h3 className="sticky top-0 z-10 border-b border-[var(--bd)] bg-[rgba(26,26,24,.97)] px-5 py-3 text-[9px] font-semibold tracking-[0.07em] text-text-tertiary uppercase">{group.title}</h3>
              {group.terms.map((item) => (
                <article key={item.term} className="border-b border-[var(--bd2)] px-5 py-4 transition-colors duration-120 hover:bg-surface-2">
                  <h4 className="text-[12.5px] font-semibold text-text-primary">{item.term}</h4>
                  <p className="mt-1.5 max-w-[68ch] text-[11.5px] leading-[1.65] text-text-secondary">{item.explanation}</p>
                </article>
              ))}
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}
