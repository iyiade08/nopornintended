import { useState } from "react";

export default function VideoPlayer({ source, poster, title, onPlay }) {
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
