import type { ObjectCategoryMetric } from "../types";

const tones = {
  active: "bg-accent",
  inactive: "bg-[var(--object-inactive)]",
  rocket: "bg-[var(--object-rocket)]",
  debris: "bg-[var(--object-debris)]",
};

export function ObjectClassificationChart({ categories }: { categories: ObjectCategoryMetric[] }) {
  const maximum = Math.max(...categories.map((category) => category.count), 1);

  return (
    <div className="space-y-3 px-4 py-4">
      {categories.map((category) => (
        <div key={category.label}>
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] text-text-secondary">{category.label}</span>
            <span className="numeric text-[10.5px] font-medium text-text-primary">{category.count}</span>
          </div>
          <div className="mt-1.5 h-1.5 bg-[rgba(228,222,208,.035)]">
            <div className={`h-full ${tones[category.tone]}`} style={{ width: `${(category.count / maximum) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
