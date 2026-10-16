// Synthetic video fixtures only. This page never connects to the catalog API.
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import VideoPlayer from "../../src/component/VideoPlayer";
import "../../src/index.css";

const dimensions = {
  Landscape: [960, 540],
  Portrait: [608, 1080],
  Square: [540, 540],
  "Small source": [240, 136],
};

export function RecordedSample({ shape }) {
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let url;
    let recorder;
    let stream;
    let interval;
    let timeout;
    try {
      const [width, height] = dimensions[shape];
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      let frame = 0;
      const draw = () => {
        context.fillStyle = "#1c1b35";
        context.fillRect(0, 0, width, height);
        context.strokeStyle = "#b79aff";
        context.lineWidth = 18;
        context.strokeRect(12, 12, width - 24, height - 24);
        context.fillStyle = "#ef87b5";
        context.beginPath();
        context.arc(
          width / 2,
          height / 2,
          Math.min(width, height) / 5,
          0,
          Math.PI * 2,
        );
        context.fill();
        context.fillStyle = "#fff";
        context.textAlign = "center";
        context.font = `600 ${Math.round(width / 18)}px sans-serif`;
        context.fillText(`${width} × ${height}`, width / 2, height / 2 + 8);
        context.font = `${Math.round(width / 24)}px sans-serif`;
        context.fillText("TOP EDGE", width / 2, 56);
        context.fillText("BOTTOM EDGE", width / 2, height - 40);
        context.fillStyle = "#a8e3d4";
        context.fillRect(30 + (frame++ % 10) * 3, height / 2 - 12, 24, 24);
      };
      draw();
      stream = canvas.captureStream(12);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";
      recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        if (!active) return;
        url = URL.createObjectURL(new Blob(chunks, { type: mimeType }));
        setSource(url);
      };
      recorder.start();
      interval = setInterval(draw, 80);
      timeout = setTimeout(() => {
        clearInterval(interval);
        recorder.stop();
        stream.getTracks().forEach((track) => track.stop());
      }, 1800);
    } catch (cause) {
      Promise.resolve().then(() => {
        if (active) setError(cause.message);
      });
    }
    return () => {
      active = false;
      clearInterval(interval);
      clearTimeout(timeout);
      if (recorder?.state === "recording") recorder.stop();
      stream?.getTracks().forEach((track) => track.stop());
      if (url) URL.revokeObjectURL(url);
    };
  }, [shape]);
  if (error) return <p role="alert">{error}</p>;
  if (!source)
    return <p role="status">Preparing {shape.toLowerCase()} sample…</p>;
  return <VideoPlayer source={source} title={`${shape} sample`} />;
}

export default function PlayerPreview() {
  const [shape, setShape] = useState("Portrait");
  return (
    <main className="detail-container page-section">
      <h1 className="player-title">Video player fit preview</h1>
      <p className="action-message">
        Synthetic sample video. All four edges should remain visible at phone,
        tablet, and desktop sizes.
      </p>
      <div className="detail-toolbar" role="group" aria-label="Sample shape">
        {[...Object.keys(dimensions), "Unavailable"].map((name) => (
          <button
            key={name}
            type="button"
            className="button button-secondary"
            aria-pressed={shape === name}
            onClick={() => setShape(name)}
          >
            {name}
          </button>
        ))}
        <button
          type="button"
          className="button button-secondary"
          onClick={() => document.querySelector("video")?.requestFullscreen()}
        >
          Fullscreen preview
        </button>
      </div>
      <article className="player-shell" style={{ marginTop: 20 }}>
        {shape === "Unavailable" ? (
          <VideoPlayer
            key={shape}
            source="/tests/fixtures/missing-video.mp4"
            title="Unavailable sample"
          />
        ) : (
          <RecordedSample key={shape} shape={shape} />
        )}
        <div className="player-info">
          <h2 className="section-heading">{shape} sample</h2>
          <p>
            The video frame follows the source shape and stays within the
            screen.
          </p>
        </div>
      </article>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<PlayerPreview />);
