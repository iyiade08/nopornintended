export default function Spinner({ loading = true, label = "Loading…" }) {
  return loading ? (
    <div role="status" className="loading-status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  ) : null;
}
