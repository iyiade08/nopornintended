import { useEffect, useState } from "react";
import VideoCard from "./VideoCard";
import { getRelatedVideos } from "../api/api";

const RelatedVideos = ({ videoId, title = "More videos" }) => {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    let ignore = false;

    const fetchrelatedVideos = async () => {
      try {
        setVideos([]);
        const data = await getRelatedVideos(videoId);
        if (!ignore) setVideos(data);
      } catch (err) {
        console.error("couldn't fetch related videos", err);
        if (!ignore) setVideos([]);
      }
    };
    fetchrelatedVideos();
    return () => {
      ignore = true;
    };
  }, [videoId]);

  if (videos.length === 0) return null;

  return (
    <div className="mt-16">
      <h2 className="mb-4 font-poppins text-xl font-semibold text-white/70 md:text-2xl">
        {title}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4">
        {videos.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </div>
  );
};

export default RelatedVideos;
