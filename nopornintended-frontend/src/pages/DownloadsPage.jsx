import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FaDownload,
  FaArrowLeft,
  FaLink,
  FaCheck,
  FaFlag,
} from "react-icons/fa";
import RelatedVideos from "../component/RelatedVideos";
import VideoFeedback from "../component/VideoFeedback";
import Comments from "../component/Comments";
import Spinner from "../component/Spinner";
import ContentState from "../component/ContentState";
import VideoPlayer from "../component/VideoPlayer";
import { getVideo, trackView, trackDownload } from "../api/api";
import { buildFileName, formatCount, mediaUrl } from "../lib/media";
import useResource from "../hooks/useResource";
import usePageTitle from "../hooks/usePageTitle";

function VideoDetails({ id }) {
  const loader = useCallback((signal) => getVideo(id, { signal }), [id]);
  const resource = useResource(loader, `video:${id}`);
  const video = resource.data;
  const [views, setViews] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [directUrl, setDirectUrl] = useState("");
  const tracked = useRef(false);
  const active = useRef(true);
  const downloadRef = useRef(null);
  const copyTimer = useRef(null);
  usePageTitle(video?.label || video?.title || "Video");
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      downloadRef.current?.abort();
      clearTimeout(copyTimer.current);
    };
  }, []);
  const onPlay = () => {
    if (tracked.current || !video) return;
    tracked.current = true;
    trackView(video.id)
      .then((data) => {
        if (active.current && data?.views != null) setViews(data.views);
      })
      .catch(() => {
        /* Playback continues when analytics is unavailable. */
      });
  };
  const copy = async () => {
    setCopyError(false);
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(window.location.href);
      if (active.current) {
        setCopied(true);
        clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      if (active.current) setCopyError(true);
    }
  };
  const download = async () => {
    if (downloadRef.current || !video) return;
    const controller = new AbortController();
    downloadRef.current = controller;
    setDownloading(true);
    setDownloadError("");
    setDirectUrl("");
    const url = mediaUrl(video.path);
    try {
      // The file comes directly from storage; analytics must not delay it.
      trackDownload(video.id, { signal: controller.signal }).catch(() => {
        /* Downloads continue when analytics is unavailable. */
      });
      if (controller.signal.aborted) return;
      if (!url) throw new Error("File unavailable");
      setDirectUrl(url);
      const response = await fetch(url, {
        mode: "cors",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("File unavailable");
      const blob = await response.blob();
      if (!active.current) return;
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = buildFileName(video);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      setDirectUrl("");
    } catch {
      if (!controller.signal.aborted && active.current)
        setDownloadError(
          "The download couldn't start. Try again, or open the video file directly.",
        );
    } finally {
      downloadRef.current = null;
      if (active.current) setDownloading(false);
    }
  };
  if (resource.loading)
    return (
      <section className="detail-container page-section">
        <Spinner label="Loading video…" slow={resource.slow} />
      </section>
    );
  if (resource.error || !video)
    return (
      <section className="detail-container page-section">
        <ContentState
          error
          title={
            resource.error?.status === 404
              ? "Video unavailable"
              : "We couldn't load this video"
          }
          description="It may have been removed, or the connection may be temporarily unavailable."
        >
          <button className="button" type="button" onClick={resource.retry}>
            Try again
          </button>
          <Link className="text-link" to="/">
            Back to the library
          </Link>
        </ContentState>
      </section>
    );
  const path = mediaUrl(video.path);
  const viewCount = views ?? video.views ?? 0;
  return (
    <div className="page-section">
      <div className="detail-container">
        <Link to="/" className="text-link back-link">
          <FaArrowLeft size={12} aria-hidden="true" />
          Back to the library
        </Link>
        <article className="player-shell">
          <VideoPlayer
            source={path}
            poster={mediaUrl(video.thumbnail)}
            title={video.label || video.title}
            onPlay={onPlay}
          />
          <div className="player-info">
            <h1 className="player-title">
              {video.label || video.title || "Untitled video"}
            </h1>
            <div className="video-meta">
              <span>
                {formatCount(viewCount)}{" "}
                {Number(viewCount) === 1 ? "view" : "views"}
              </span>
              {video.duration && <span>{video.duration}</span>}
              {video.category && (
                <Link
                  className="brand-accent"
                  to={`/?category=${encodeURIComponent(video.category.slug)}`}
                >
                  {video.category.name}
                </Link>
              )}
            </div>
            {video.description && (
              <p className="detail-description">{video.description}</p>
            )}
            <div className="detail-toolbar">
              <VideoFeedback video={video} />
              <button
                className="button"
                type="button"
                onClick={download}
                disabled={downloading || !path}
              >
                <FaDownload size={13} aria-hidden="true" />
                {downloading ? "Downloading…" : "Download"}
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={copy}
              >
                {copied ? (
                  <FaCheck aria-hidden="true" />
                ) : (
                  <FaLink aria-hidden="true" />
                )}
                {copied ? "Link copied" : "Copy link"}
              </button>
            </div>
            <div aria-live="polite">
              {copied && (
                <p className="action-message">
                  The video link has been copied.
                </p>
              )}
            </div>
            {copyError && (
              <div className="action-message" role="status">
                <p>Copy the video link below:</p>
                <input
                  className="copy-field"
                  aria-label="Video link"
                  readOnly
                  value={window.location.href}
                  onFocus={(event) => event.target.select()}
                />
              </div>
            )}
            {downloading && (
              <p className="action-message" role="status">
                Preparing the file. Keep this page open until your download
                starts.
                {directUrl && (
                  <>
                    {" "}
                    Taking too long?{" "}
                    <button
                      className="text-link"
                      type="button"
                      onClick={() => downloadRef.current?.abort()}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </p>
            )}
            {downloadError && (
              <div className="action-message" role="alert">
                <p>{downloadError}</p>
                {directUrl && (
                  <a
                    className="text-link"
                    href={directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open video file
                  </a>
                )}
              </div>
            )}
            <Link
              className="text-link"
              to={`/report?video=${encodeURIComponent(video.id)}`}
            >
              <FaFlag aria-hidden="true" size={11} />
              Report this video
            </Link>
          </div>
        </article>
        <Comments videoId={video.id} />
      </div>
      <div className="container">
        <RelatedVideos video={video} />
      </div>
    </div>
  );
}
export default function DownloadsPage() {
  const { id } = useParams();
  return <VideoDetails key={id} id={id} />;
}
