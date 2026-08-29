export type MakerPreviewStatus = "idle" | "pending" | "success" | "error";

export function MakerStatus({
  errors,
  onSaveDraft,
  onPreview,
  onCommission,
  isAuthenticated,
  previewStatus,
  previewMessage,
  commissionStatus,
  commissionMessage,
}: {
  errors: string[];
  onSaveDraft: () => void;
  onPreview: () => void;
  onCommission: () => void;
  isAuthenticated: boolean;
  previewStatus: MakerPreviewStatus;
  previewMessage: string;
  commissionStatus: MakerPreviewStatus;
  commissionMessage: string;
}) {
  const ready = errors.length === 0;
  const screeningTone = previewStatus === "success"
    ? "border-[var(--nominal-border)] bg-[var(--nominal-fill)] text-nominal"
    : previewStatus === "error"
      ? "border-[var(--critical-border)] bg-[var(--critical-fill)] text-critical"
      : "border-[var(--medium-border)] bg-[var(--medium-fill)] text-medium";
  const screeningTitle = previewStatus === "success"
    ? "Backend preview complete"
    : previewStatus === "error"
      ? "Backend preview failed"
      : previewStatus === "pending"
        ? "Running backend preview…"
        : "Backend conjunction screening";

  return (
    <section className="panel-rise border border-[var(--bd)] bg-surface-1">
      <header className="border-b border-[var(--bd)] bg-surface-2 px-3.5 py-[11px]">
        <h2 className="text-[12.5px] font-semibold tracking-[-0.006em]">Simulation status</h2>
      </header>
      <div className="space-y-3 px-4 py-4">
        <div className={`border px-3 py-2.5 ${ready ? "border-[var(--nominal-border)] bg-[var(--nominal-fill)]" : "border-[var(--critical-border)] bg-[var(--critical-fill)]"}`}>
          <div className={`text-[10.5px] font-medium ${ready ? "text-nominal" : "text-critical"}`}>
            {ready ? "Local orbit preview ready" : "Configuration needs attention"}
          </div>
          {!ready ? (
            <ul className="mt-2 space-y-1 text-[10px] text-text-secondary">
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          ) : null}
        </div>
        <div className={`border px-3 py-2.5 ${screeningTone}`}>
          <div className="text-[10.5px] font-medium">{screeningTitle}</div>
          <p className="mt-1.5 text-[10px] leading-[1.5] text-text-secondary">
            {previewMessage || "Run a backend preview to propagate the configured orbit and screen it against the catalogue."}
          </p>
        </div>
        <button
          disabled={!ready || previewStatus === "pending"}
          onClick={onPreview}
          className="h-10 w-full border border-[var(--acc-border)] bg-[var(--acc-tint)] text-[11px] font-medium text-[var(--acc-text)] transition-colors hover:border-[var(--acc)] hover:text-[var(--acc-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {previewStatus === "pending" ? "Previewing…" : "Run backend preview"}
        </button>
        <button
          disabled={!ready || previewStatus !== "success" || commissionStatus === "pending" || commissionStatus === "success"}
          onClick={onCommission}
          className="h-10 w-full border border-[var(--nominal-border)] bg-[var(--nominal-fill)] text-[11px] font-medium text-nominal transition-colors hover:border-nominal disabled:cursor-not-allowed disabled:opacity-40"
        >
          {commissionStatus === "pending" ? "Commissioning…" : commissionStatus === "success" ? "Commissioned" : isAuthenticated ? "Commission object" : "Sign in to commission"}
        </button>
        {commissionMessage ? (
          <p className={`border px-3 py-2 text-[10px] leading-[1.5] ${commissionStatus === "error" ? "border-[var(--critical-border)] bg-[var(--critical-fill)] text-critical" : "border-[var(--nominal-border)] bg-[var(--nominal-fill)] text-nominal"}`}>
            {commissionMessage}
          </p>
        ) : null}
        <button
          disabled={!ready}
          onClick={onSaveDraft}
          className="h-10 w-full border border-[var(--bd)] text-[11px] font-medium text-text-secondary transition-colors hover:border-[var(--acc-border)] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save local draft
        </button>
        <p className="text-[9.5px] leading-[1.5] text-text-tertiary">
          Saving a draft does not add the object to the database. Preview first, then commission the validated object to persist its catalogue and orbit records.
        </p>
      </div>
    </section>
  );
}
