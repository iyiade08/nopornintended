import { useSearchParams } from "react-router-dom";
export default function Pagination({ data, page }) {
  const [params, setParams] = useSearchParams();
  if (!data?.next && !data?.previous) return null;
  const go = (nextPage) => {
    const next = new URLSearchParams(params);
    nextPage === 1 ? next.delete("page") : next.set("page", String(nextPage));
    setParams(next);
  };
  return (
    <nav className="pagination" aria-label="Video pages">
      <button
        className="button button-secondary"
        type="button"
        disabled={!data.previous}
        onClick={() => go(Math.max(1, page - 1))}
      >
        Previous
      </button>
      <span aria-current="page">Page {page}</span>
      <button
        className="button button-secondary"
        type="button"
        disabled={!data.next}
        onClick={() => go(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
