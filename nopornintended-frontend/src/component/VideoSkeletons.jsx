export default function VideoSkeletons() {
  return (
    <div role="status" aria-label="Loading videos">
      <span className="sr-only">Loading videos…</span>
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
