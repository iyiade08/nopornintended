export default function Spinner({
  loading = true,
  label = "Loading…",
  slow = false,
}) {
  return loading ? (
    <div role="status" className="loading-status">
      <span className="spinner" aria-hidden="true" />
      <span>
        {slow
          ? "Loading is taking longer than usual. Please keep this page open."
          : label}
      </span>
    </div>
  ) : null;
}
