import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  tone = "muted",
  action,
  className = "",
}: {
  title: string;
  description?: string;
  tone?: "muted" | "error";
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--bd)] bg-surface-1 px-8 py-12 text-center ${className}`}
    >
      <p
        className={`text-[12px] font-medium ${tone === "error" ? "text-critical" : "text-text-secondary"}`}
      >
        {title}
      </p>
      {description ? (
        <p className="max-w-[380px] text-[10.5px] leading-relaxed text-text-tertiary">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
