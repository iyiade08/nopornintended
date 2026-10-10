import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import VideoCard from "./VideoCard";
import Spinner from "./Spinner";
import { getVideos } from "../api/api";

const VideoListsPage = () => {
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category") || "";

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false; // avoids setting state if the page unmounts mid-request

    const loadVideos = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getVideos(category ? { category } : {});
        if (!ignore) setVideos(data);
      } catch (err) {
        if (!ignore) setError(err.message || "Something went wrong");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadVideos();

    return () => {
      ignore = true;
    };
  }, [category]);

  return (
    <div className="pt-28 md:pt-44 genLayout mx-auto">
      {/* Shown only when a category filter is active */}
      {category && (
        <div className="flex items-center justify-between px-4 font-poppins">
          <h2 className="text-xl font-semibold capitalize text-white md:text-2xl">
            {category.replace(/-/g, " ")}
          </h2>
          <Link
            to="/"
            className="text-sm text-white/70 transition-colors hover:text-[#CB4CB5]"
          >
            Show all
          </Link>
        </div>
      )}

      {loading ? (
        <Spinner loading={loading} />
      ) : error ? (
        <p className="p-4 text-center font-poppins text-red-400">
          Couldn't load videos: {error}
        </p>
      ) : videos.length === 0 ? (
        <p className="p-4 text-center font-poppins text-white/70">
          {category ? "No videos in this category yet." : "No videos yet."}
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoListsPage;
