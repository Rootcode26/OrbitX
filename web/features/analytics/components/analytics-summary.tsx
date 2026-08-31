interface AnalyticsSummaryMetric {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "accent" | "critical";
}

const tones = {
  default: "text-text-primary",
  accent: "text-accent",
  critical: "text-critical",
};

export function AnalyticsSummary({ metrics }: { metrics: AnalyticsSummaryMetric[] }) {
  return (
    <section aria-label="Current analytics summary" className="panel-rise stagger-rise grid grid-cols-2 border border-[var(--bd)] bg-surface-1 min-[900px]:grid-cols-3 min-[1400px]:grid-cols-6">
      {metrics.map((metric) => (
        <article key={metric.label} className="min-w-0 border-r border-b border-[var(--bd2)] px-4 py-3.5 min-[1400px]:border-b-0">
          <h2 className="text-[10px] font-medium text-text-tertiary">{metric.label}</h2>
          <p className={`numeric mt-3 truncate text-[25px] leading-none font-medium ${tones[metric.tone ?? "default"]}`}>
            {metric.value}
          </p>
          <p className="numeric mt-2 truncate text-[9px] text-text-tertiary">{metric.detail}</p>
        </article>
      ))}
    </section>
  );
}
