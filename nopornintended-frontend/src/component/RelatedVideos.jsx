import { useCallback } from "react";
import VideoCard from "./VideoCard";
import { getRelatedVideos } from "../api/api";
import useResource from "../hooks/useResource";
import Spinner from "./Spinner";
export default function RelatedVideos({ videoId }) {
  const loader = useCallback(
    (signal) => getRelatedVideos(videoId, { signal }),
    [videoId],
  );
  const resource = useResource(loader, `related:${videoId}`);
  if (!resource.loading && !resource.error && !resource.data?.results.length)
    return null;
  return (
    <section className="related-section" aria-labelledby="related-title">
      <h2 className="section-heading" id="related-title">
        More to explore
      </h2>
      {resource.loading ? (
        <Spinner label="Loading related videos…" />
      ) : resource.error ? (
        <div className="action-message">
          <p>Related videos are temporarily unavailable.</p>
          <button type="button" className="text-link" onClick={resource.retry}>
            Try again
          </button>
        </div>
      ) : (
        <div className="video-grid">
          {resource.data.results.map((video) => (
            <VideoCard key={video.id} video={video} heading="h3" />
          ))}
        </div>
      )}
    </section>
  );
}
