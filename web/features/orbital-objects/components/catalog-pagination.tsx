export function CatalogPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-[var(--bd)] px-3.5 py-2.5">
      <span className="numeric text-[9px] text-text-tertiary">10 objects per page</span>
      <div className="flex items-center gap-1">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-7 border border-[var(--bd)] px-2.5 text-[10px] text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          Previous
        </button>
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-7 border border-[var(--bd)] px-2.5 text-[10px] text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}
