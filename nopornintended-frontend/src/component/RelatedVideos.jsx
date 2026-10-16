import { useCallback, useRef, useState } from "react";
import VideoCard from "./VideoCard";
import { getRelatedVideos } from "../api/api";
import useResource from "../hooks/useResource";
import Spinner from "./Spinner";
import Pagination from "./Pagination";
import { VIDEO_PAGE_SIZE } from "../lib/pagination";

function PerformerVideos({ videoId, performer }) {
  const [page, setPage] = useState(1);
  const sectionRef = useRef(null);
  const loader = useCallback(
    (signal) =>
      getRelatedVideos(
        videoId,
        { page, page_size: VIDEO_PAGE_SIZE },
        { signal },
      ),
    [videoId, page],
  );
  const resource = useResource(loader, `related:${videoId}:${page}`);
  if (!resource.loading && !resource.error && !resource.data?.results.length)
    return null;
  return (
    <section
      ref={sectionRef}
      className="related-section"
      aria-labelledby="related-title"
      aria-busy={resource.loading}
    >
      <h2 className="section-heading" id="related-title">
        More from {performer.name}
      </h2>
      {resource.loading ? (
        <Spinner label={`Loading more videos from ${performer.name}…`} />
      ) : resource.error ? (
        <div className="action-message">
          <p>Other videos from this person are temporarily unavailable.</p>
          <button type="button" className="text-link" onClick={resource.retry}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="video-grid">
            {resource.data.results.map((video) => (
              <VideoCard key={video.id} video={video} heading="h3" />
            ))}
          </div>
          <Pagination
            data={resource.data}
            page={page}
            label={`More videos from ${performer.name}`}
            onPageChange={(nextPage) => {
              setPage(nextPage);
              sectionRef.current?.scrollIntoView({ block: "start" });
            }}
          />
        </>
      )}
    </section>
  );
}

export default function RelatedVideos({ video }) {
  if (!video.performer) return null;
  return (
    <PerformerVideos
      key={`${video.id}:${video.performer.id}`}
      videoId={video.id}
      performer={video.performer}
    />
  );
}
