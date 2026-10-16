import { Link } from "react-router-dom";
import VideoFeedback from "./VideoFeedback";
import VideoThumbnail from "./VideoThumbnail";
import { formatCount, mediaUrl } from "../lib/media";

export default function VideoCard({ video, heading: Heading = "h2" }) {
  const title = video.label || video.title || "Untitled video";
  const thumbnail = mediaUrl(video.thumbnail);
  const source = mediaUrl(video.path);
  const views = Math.max(0, Number(video.views) || 0);
  return (
    <article className="video-card">
      <Link
        to={`/downloads/${encodeURIComponent(video.id)}`}
        className="card-link"
        aria-label={`Watch ${title}`}
      >
        <div className="video-media">
          <VideoThumbnail
            key={`${thumbnail}:${source}`}
            thumbnail={thumbnail}
            source={source}
          />
          {video.duration && (
            <span className="duration-badge">{video.duration}</span>
          )}
        </div>
        <div className="card-content">
          <Heading className="card-title">{title}</Heading>
          <div className="video-meta">
            <span>
              {formatCount(views)} {views === 1 ? "view" : "views"}
            </span>
            {video.category?.name && <span>{video.category.name}</span>}
          </div>
        </div>
      </Link>
      <VideoFeedback video={video} />
    </article>
  );
}
