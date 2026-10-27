export default function VideoSkeletons({ slow = false }) {
  return (
    <div role="status">
      {slow ? (
        <p className="action-message loading-notice">
          Loading is taking longer than usual. Please keep this page open.
        </p>
      ) : (
        <span className="sr-only">Loading videos…</span>
      )}
      <div className="video-grid" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div className="skeleton-card" key={index}>
            <div className="skeleton skeleton-media" />
            <div className="skeleton-lines">
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
