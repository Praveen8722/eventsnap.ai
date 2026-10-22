import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginationProps {
  /** 1-based index of the first and last rows shown. */
  from: number;
  to: number;
  /** Rows matching the current search and filters. */
  total: number;
  /** Plural noun for the rows, e.g. "bookings". */
  itemLabel: string;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

/** Page numbers to show: first, last, and the current page with its neighbours. */
function visiblePages(page: number, pageCount: number): (number | '…')[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter(p => p >= 1 && p <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('…');
    result.push(p);
  });
  return result;
}

export function TablePagination({ from, to, total, itemLabel, page, pageCount, onPageChange }: TablePaginationProps) {
  const arrow = 'w-7 h-7 flex items-center justify-center rounded-lg text-[#8080A0] hover:bg-[#F5F6FA] disabled:opacity-40 disabled:hover:bg-transparent';

  return (
    <div className="px-6 py-3.5 border-t border-[#F0F0F8] flex items-center justify-between">
      <span className="text-[#8080A0] text-xs">
        {total === 0 ? `No ${itemLabel}` : `Showing ${from}–${to} of ${total.toLocaleString('en-IN')} ${itemLabel}`}
      </span>
      {pageCount > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button type="button" className={arrow} onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="Previous page">
            <ChevronLeft size={14} />
          </button>
          {visiblePages(page, pageCount).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="w-7 text-center text-xs text-[#A0A0C0]">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`w-7 h-7 rounded-lg text-xs font-medium ${p === page ? 'bg-[#6C63FF] text-white' : 'text-[#8080A0] hover:bg-[#F5F6FA]'}`}
              >
                {p}
              </button>
            ),
          )}
          <button type="button" className={arrow} onClick={() => onPageChange(page + 1)} disabled={page === pageCount} aria-label="Next page">
            <ChevronRight size={14} />
          </button>
        </nav>
      )}
    </div>
  );
}
