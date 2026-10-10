import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import VideoCard from "./VideoCard";
import Spinner from "./Spinner";
import { searchVideos } from "../api/api";

const Search = () => {
  const [searchParams] = useSearchParams();
  const q = (searchParams.get("q") || "").trim();

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Nothing typed, nothing to search (the page handles this case below)
    if (!q) return;

    let ignore = false;

    const runSearch = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await searchVideos(q);
        if (!ignore) setVideos(data);
      } catch (err) {
        if (!ignore) setError(err.message || "Something went wrong");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    runSearch();

    return () => {
      ignore = true;
    };
  }, [q]);

  return (
    <div className="pt-28 md:pt-44 genLayout mx-auto">
      <div className="flex items-center justify-between px-4 font-poppins">
        <h2 className="text-xl font-semibold text-white md:text-2xl">
          {q ? `Results for "${q}"` : "Search"}
        </h2>
        <Link
          to="/"
          className="text-sm text-white/70 transition-colors hover:text-[#CB4CB5]"
        >
          Show all
        </Link>
      </div>

      {!q ? (
        <p className="p-4 text-center font-poppins text-white/70">
          Type something in the search bar to find videos.
        </p>
      ) : loading ? (
        <Spinner loading={loading} />
      ) : error ? (
        <p className="p-4 text-center font-poppins text-red-400">
          Couldn't search: {error}
        </p>
      ) : videos.length === 0 ? (
        <p className="p-4 text-center font-poppins text-white/70">
          No videos found for "{q}".
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

export default Search;
