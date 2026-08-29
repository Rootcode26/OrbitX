export interface HistorySelectorItem {
  noradCatId: number;
  name: string;
}

interface HistorySelectorProps {
  histories: HistorySelectorItem[];
  selectedId: number;
  onSelect: (satelliteId: number) => void;
  onRemove: (satelliteId: number) => void;
}

export function HistorySelector({ histories, selectedId, onSelect, onRemove }: HistorySelectorProps) {
  return (
    <section className="flex flex-wrap items-center gap-1.5">
      {histories.map((history) => {
        const selected = history.noradCatId === selectedId;
        return (
          <div
            key={history.noradCatId}
            className={`flex items-stretch border transition-colors duration-140 ${
              selected
                ? "border-accent bg-[var(--acc-tint)]"
                : "border-[var(--bd)] bg-surface-1 hover:border-[var(--bd2)]"
            }`}
          >
            <button
              onClick={() => onSelect(history.noradCatId)}
              className={`px-3 py-1.5 text-[12px] transition-colors duration-140 ${
                selected ? "font-semibold text-white" : "text-text-secondary hover:text-white"
              }`}
            >
              {history.name}
            </button>
            <button
              aria-label={`Remove ${history.name} from wishlist`}
              title="Remove from wishlist"
              onClick={() => onRemove(history.noradCatId)}
              className="border-l border-[var(--bd)] px-2 text-[13px] leading-none text-text-tertiary transition-colors duration-140 hover:text-critical"
            >
              ×
            </button>
          </div>
        );
      })}
    </section>
  );
}
