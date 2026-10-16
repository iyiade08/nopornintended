import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import VideoThumbnail from "../../src/component/VideoThumbnail";
import sampleVideo from "../../src/assets/video/coming-soon .mp4";
import "../../src/index.css";

const cases = [
  {
    name: "Uploaded thumbnail",
    thumbnail: "/favicon.svg",
    source: sampleVideo,
  },
  { name: "No uploaded thumbnail", thumbnail: "", source: sampleVideo },
  {
    name: "Broken uploaded thumbnail",
    thumbnail: "/missing-thumbnail-test.jpg",
    source: sampleVideo,
  },
  {
    name: "Unavailable video",
    thumbnail: "",
    source: "/missing-video-test.mp4",
  },
];

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <main className="container page-section">
      <h1 className="page-title">Automatic thumbnail checks</h1>
      <p className="page-description">
        Non-explicit local sample media. No API requests or view tracking.
      </p>
      <div className="video-grid" style={{ marginTop: 24 }}>
        {cases.map((item) => (
          <article className="video-card" key={item.name} data-case={item.name}>
            <div className="video-media">
              <VideoThumbnail thumbnail={item.thumbnail} source={item.source} />
            </div>
            <h2 className="card-title card-content">{item.name}</h2>
          </article>
        ))}
      </div>
      <div
        className="video-card"
        data-case="Offscreen video"
        style={{ marginTop: 1800, maxWidth: 320 }}
      >
        <div className="video-media">
          <VideoThumbnail thumbnail="" source={sampleVideo} />
        </div>
        <p className="card-content">
          This preview should only load near the viewport.
        </p>
      </div>
    </main>
  </StrictMode>,
);
