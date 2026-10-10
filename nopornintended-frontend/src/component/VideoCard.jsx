import { useRef, useState } from "react";
import { FaPlay } from "react-icons/fa";
import { Link } from "react-router-dom";

// detail = true  -> downloads page: plays the video with native controls
// detail = false -> grid: thumbnail is a link to /downloads/:id
const VideoCard = ({ video, detail = false }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  if (!video) return null;

  const videoEl = (
    <video
      key={video.id}
      ref={videoRef}
      src={video.path}
      playsInline
      preload="metadata"
      controls={detail}
      autoPlay={detail}
      onPlay={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
      onEnded={() => setIsPlaying(false)}
      className={`h-full w-full ${
        detail
          ? "object-contain"
          : "object-cover transition-transform group-hover:scale-110 duration-700"
      }`}
    />
  );

  const playOverlay = (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#FD3E81] to-[#895CF5] text-white shadow-lg">
        <FaPlay className="ml-1 h-4 w-4" />
      </span>
    </div>
  );

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-xl bg-white/5 border border-white/10 shadow-xl transition-transform duration-300 ${
        detail ? "w-full" : "hover:-translate-y-1"
      }`}
    >
      {detail ? (
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          {videoEl}
        </div>
      ) : (
        <Link
          to={`/downloads/${video.id}`}
          className="relative block aspect-video w-full cursor-pointer overflow-hidden bg-black"
        >
          {videoEl}
          {!isPlaying && playOverlay}
        </Link>
      )}

      {detail ? (
        <div className="flex flex-col gap-2 p-4">
          <p className="font-poppins text-base md:text-xl font-medium capitalize text-white">
            {video.label}
          </p>
          <div className="flex justify-between text-xs text-slate-400">
            <span>12:34</span>
            <span>1.2M views</span>
          </div>
        </div>
      ) : (
        <Link to={`/downloads/${video.id}`}>
          <div className="flex flex-col gap-2 p-3">
            <p className="font-poppins text-sm md:text-base font-medium capitalize text-white line-clamp-2">
              {video.label}
            </p>
            <div className="flex justify-between text-xs text-slate-400">
              <span>12:34</span>
              <span>1.2M views</span>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
};

export default VideoCard;
