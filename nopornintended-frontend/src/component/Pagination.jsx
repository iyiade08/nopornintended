import { useSearchParams } from "react-router-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { pageWindow, VIDEO_PAGE_SIZE } from "../lib/pagination";

export default function Pagination({ data, page }) {
  const [params, setParams] = useSearchParams();
  const totalPages = Math.ceil((Number(data?.count) || 0) / VIDEO_PAGE_SIZE);
  if (totalPages <= 1 || (!data?.next && !data?.previous)) return null;
  const compactPages = pageWindow(page, totalPages, 3);
  const go = (nextPage) => {
    if (nextPage === page || nextPage < 1 || nextPage > totalPages) return;
    const next = new URLSearchParams(params);
    nextPage === 1 ? next.delete("page") : next.set("page", String(nextPage));
    setParams(next);
  };
  return (
    <nav className="pagination video-pagination" aria-label="Video pages">
      <div className="pagination-controls">
        <button
          className="pagination-arrow"
          type="button"
          aria-label="Previous page"
          disabled={page <= 1 || !data.previous}
          onClick={() => go(page - 1)}
        >
          <FaChevronLeft aria-hidden="true" />
        </button>
        {pageWindow(page, totalPages).map((number) => (
          <button
            key={number}
            className={`pagination-page${compactPages.includes(number) ? " pagination-page--compact" : ""}`}
            type="button"
            aria-label={`Page ${number}`}
            aria-current={number === page ? "page" : undefined}
            onClick={() => go(number)}
          >
            {number}
          </button>
        ))}
        <button
          className="pagination-arrow"
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages || !data.next}
          onClick={() => go(page + 1)}
        >
          <FaChevronRight aria-hidden="true" />
        </button>
      </div>
      <p className="pagination-caption" role="status">
        Page {page} of {totalPages}
      </p>
    </nav>
  );
}
