import { useState } from "react";
import { FaPlay } from "react-icons/fa";
import { Link } from "react-router-dom";
import VideoFeedback from "./VideoFeedback";
import { formatCount, mediaUrl } from "../lib/media";

export default function VideoCard({ video, heading: Heading = "h2" }) {
  const [failedThumbnail, setFailedThumbnail] = useState("");
  const title = video.label || video.title || "Untitled video";
  const thumbnail = mediaUrl(video.thumbnail);
  const showThumbnail = thumbnail && failedThumbnail !== thumbnail;
  const views = Math.max(0, Number(video.views) || 0);
  return (
    <article className="video-card">
      <Link
        to={`/downloads/${encodeURIComponent(video.id)}`}
        className="card-link"
        aria-label={`Watch ${title}`}
      >
        <div className="video-media">
          {showThumbnail ? (
            <>
              <img
                src={thumbnail}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => setFailedThumbnail(thumbnail)}
              />
              <span className="thumbnail-play" aria-hidden="true">
                <span className="play-badge">
                  <FaPlay size={13} />
                </span>
              </span>
            </>
          ) : (
            <div className="media-placeholder" aria-hidden="true">
              <span className="play-badge">
                <FaPlay size={13} />
              </span>
              <span>Preview unavailable</span>
            </div>
          )}
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
