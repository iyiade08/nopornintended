import { useEffect, useRef, useState } from "react";
import { FaPlay } from "react-icons/fa";
import { loadPreviewFrame, queuePreview } from "../lib/videoPreview";
import { hostedVideo } from "../lib/hostedVideo";

export default function VideoThumbnail({ thumbnail, source }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [frameState, setFrameState] = useState("idle");
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hasImage = Boolean(thumbnail) && !imageFailed;
  const embedded = Boolean(hostedVideo(source));
  const useVideo = !hasImage && !embedded;

  useEffect(() => {
    if (!useVideo || !source) return;
    const video = videoRef.current;
    const controller = new AbortController();
    let scheduled = false;
    const load = () => {
      if (scheduled || controller.signal.aborted) return;
      scheduled = true;
      setFrameState("loading");
      queuePreview(
        () => loadPreviewFrame(video, source, controller.signal),
        controller.signal,
      ).then(
        () => {
          if (!controller.signal.aborted) setFrameState("ready");
        },
        () => {
          if (!controller.signal.aborted) setFrameState("unavailable");
        },
      );
    };
    let observer;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            load();
          }
        },
        { rootMargin: "200px" },
      );
      observer.observe(containerRef.current);
    } else {
      Promise.resolve().then(load);
    }
    return () => {
      observer?.disconnect();
      controller.abort();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [source, useVideo]);

  const ready = hasImage || frameState === "ready";
  const unavailable = embedded || !source || frameState === "unavailable";
  return (
    <div
      ref={containerRef}
      className="video-thumbnail"
      data-preview-state={
        hasImage ? "image" : unavailable ? "unavailable" : frameState
      }
    >
      {hasImage ? (
        <img
          src={thumbnail}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : source && !embedded ? (
        <video
          ref={videoRef}
          className="video-preview"
          muted
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          disablePictureInPicture
          disableRemotePlayback
        />
      ) : null}
      {!ready && (
        <div className="media-placeholder" aria-hidden="true">
          <span className="play-badge">
            <FaPlay size={13} />
          </span>
          <span>
            {embedded
              ? "Play video"
              : unavailable
                ? "Preview unavailable"
                : "Loading preview…"}
          </span>
        </div>
      )}
      {ready && (
        <span className="thumbnail-play" aria-hidden="true">
          <span className="play-badge">
            <FaPlay size={13} />
          </span>
        </span>
      )}
    </div>
  );
}
