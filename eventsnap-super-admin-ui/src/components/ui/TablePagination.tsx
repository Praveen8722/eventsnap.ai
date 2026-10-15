interface TablePaginationProps {
  shown: number;
  total: number;
  /** Plural noun for the rows, e.g. "bookings". */
  itemLabel: string;
  pageCount: number;
}

// Presentational only: page buttons are placeholders until server-side pagination exists.
export function TablePagination({ shown, total, itemLabel, pageCount }: TablePaginationProps) {
  const pages = [1, 2, 3, '...', pageCount];

  return (
    <div className="px-6 py-3.5 border-t border-[#F0F0F8] flex items-center justify-between">
      <span className="text-[#8080A0] text-xs">
        Showing {shown} of {total} {itemLabel}
      </span>
      <div className="flex items-center gap-1">
        {pages.map((page, i) => (
          <button
            key={i}
            type="button"
            aria-current={page === 1 ? 'page' : undefined}
            className={`w-7 h-7 rounded-lg text-xs font-medium ${page === 1 ? 'bg-[#6C63FF] text-white' : 'text-[#8080A0] hover:bg-[#F5F6FA]'}`}
          >
            {page}
          </button>
        ))}
      </div>
    </div>
  );
}
