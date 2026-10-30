import { useState } from "react";
import { FaPlay } from "react-icons/fa";
import { hostedVideo } from "../lib/hostedVideo";

function HostedPlayer({ host, poster, title, onPlay }) {
  const [started, setStarted] = useState(false);
  return (
    <div className="hosted-player">
      <div className="player-media player-media--embed">
        {started ? (
          <iframe
            src={host.embedUrl}
            title={`${title || "Video"} — ${host.provider} player`}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            className="hosted-player-start"
            aria-label={`Play ${title || "video"}`}
            onClick={() => {
              setStarted(true);
              // Cross-origin playback events are unavailable. Count only the
              // explicit request to start, never an iframe or thumbnail load.
              onPlay?.();
            }}
          >
            {poster && <img src={poster} alt="" />}
            <span className="hosted-player-prompt">
              <span className="play-badge">
                <FaPlay aria-hidden="true" />
              </span>
              <span>Play video</span>
            </span>
          </button>
        )}
      </div>
      <p className="action-message hosted-player-note">
        Playback is provided by {host.provider} and may include ads.{" "}
        <a
          className="text-link"
          href={host.embedUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open on {host.provider}
        </a>
      </p>
    </div>
  );
}

function FilePlayer({ source, poster, title, onPlay }) {
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [dimensions, setDimensions] = useState(null);

  return (
    <div
      className="player-media"
      style={
        dimensions
          ? {
              "--video-aspect": dimensions.width / dimensions.height,
              "--video-width": `${dimensions.width}px`,
            }
          : undefined
      }
    >
      {source && (
        <video
          key={attempt}
          src={source}
          poster={poster || undefined}
          playsInline
          controls
          preload="metadata"
          aria-label={title}
          onPlay={onPlay}
          onLoadedMetadata={(event) => {
            const { videoWidth, videoHeight } = event.currentTarget;
            if (videoWidth && videoHeight)
              setDimensions({ width: videoWidth, height: videoHeight });
          }}
          onError={() => setError(true)}
        />
      )}
      {(!source || error) && (
        <div className="player-error" role="alert">
          <p>This video couldn't be played.</p>
          {source && (
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                setError(false);
                setAttempt((value) => value + 1);
              }}
            >
              Retry playback
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function VideoPlayer(props) {
  const host = hostedVideo(props.source);
  return host ? (
    <HostedPlayer key={host.embedUrl} {...props} host={host} />
  ) : (
    <FilePlayer key={props.source} {...props} />
  );
}
