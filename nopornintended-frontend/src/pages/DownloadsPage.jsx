import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FaDownload,
  FaArrowLeft,
  FaLink,
  FaCheck,
  FaFlag,
} from "react-icons/fa";
import VideoCard from "../component/VideoCard";
import RelatedVideos from "../component/RelatedVideos";
import Spinner from "../component/Spinner";
import AnimatedBorderButton from "../common/AnimatedBorderButton";
import { getVideo, trackView, trackDownload } from "../api/api";

// Clean filename from the label, keeping the original extension
const buildFileName = (video) => {
  const extension = video.path.split("?")[0].split(".").pop() || "mp4";
  const base = (video.label || `video-${video.id}`)
    .toLowerCase()
    .replace(/['’]/g, "") // drop apostrophes so "bryan's" -> "bryans"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || `video-${video.id}`}.${extension}`;
};

const DownloadsPage = () => {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // Remembers which video we last counted, so one visit = one view
  const trackedIdRef = useRef(null);

  // Fetch the main video whenever the id in the URL changes
  useEffect(() => {
    let ignore = false;

    const loadVideo = async () => {
      try {
        setLoading(true);
        setError("");
        setVideo(null);
        setCopied(false);
        setDownloadError("");
        const data = await getVideo(id);
        if (!ignore) setVideo(data);
      } catch (err) {
        if (!ignore) setError(err.message || "Something went wrong");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadVideo();
    window.scrollTo({ top: 0, behavior: "smooth" });

    return () => {
      ignore = true;
    };
  }, [id]);

  // Count a view once the video has actually loaded
  useEffect(() => {
    if (!video || trackedIdRef.current === video.id) return;
    trackedIdRef.current = video.id;

    trackView(video.id).catch((err) => {
      console.error("Could not track view", err);
    });
  }, [video]);

  // Tab title = video name
  useEffect(() => {
    if (video) document.title = video.title || video.label;
    return () => {
      document.title = "nopornintended";
    };
  }, [video]);

  // ---- all hooks are above this line; early returns only below ----

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Could not copy link", err);
    }
  };

  const handleDownload = async () => {
    if (downloading || !video) return;

    setDownloading(true);
    setDownloadError("");

    try {
      // 1. Count the download and get the file URL from the backend
      const data = await trackDownload(video.id);
      const fileUrl = data.download_url || video.path;

      try {
        // 2. Fetch the file as a blob so the browser saves it (works cross-origin)
        const res = await fetch(fileUrl, { mode: "cors", cache: "no-store" });
        if (!res.ok) throw new Error(`File request failed (${res.status})`);

        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = buildFileName(video);
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
      } catch (blobErr) {
        // 3. Fallback: let the browser open the file itself
        console.error("Blob download failed, opening file instead", blobErr);
        window.open(fileUrl, "_blank");
      }
    } catch (err) {
      console.error("Download failed", err);
      setDownloadError("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-28 md:pt-44">
        <Spinner loading={loading} />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="pt-28 md:pt-44 text-center font-poppins text-white/90">
        <p className="mb-2">Couldn't load this video.</p>
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        <Link to="/" className="underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-28 md:pt-44 pb-16">
      <div className="genLayout mx-auto px-4">
        {/* Back link */}
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 font-poppins text-sm text-white/70 transition-colors hover:text-[#CB4CB5]"
        >
          <FaArrowLeft className="h-3 w-3" /> Back to videos
        </Link>

        {/* Main video + actions */}
        <div className="flex flex-col items-center justify-center gap-4 font-poppins text-white/90">
          <div className="w-full max-w-3xl">
            <VideoCard video={video} detail />
          </div>

          {video.description && (
            <p className="w-full max-w-3xl text-sm text-white/70 md:text-base">
              {video.description}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <AnimatedBorderButton
              as="button"
              onClick={handleDownload}
              disabled={downloading}
            >
              <FaDownload className="h-5 w-5" />
              {downloading ? "Downloading..." : "Download Video"}
            </AnimatedBorderButton>

            <AnimatedBorderButton as="button" onClick={handleCopyLink}>
              {copied ? (
                <>
                  <FaCheck className="h-5 w-5" /> Copied!
                </>
              ) : (
                <>
                  <FaLink className="h-5 w-5" /> Share
                </>
              )}
            </AnimatedBorderButton>
          </div>

          {downloadError && (
            <p className="text-sm text-red-400">{downloadError}</p>
          )}

          {/* Report link: opens the report form with this video pre-filled */}
          <Link
            to={`/report?video=${video.id}`}
            className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-[#FD3E81]"
          >
            <FaFlag className="h-3 w-3" /> Report this video
          </Link>
        </div>

        {/* Related videos */}
        <RelatedVideos videoId={id} />
      </div>
    </div>
  );
};

export default DownloadsPage;
