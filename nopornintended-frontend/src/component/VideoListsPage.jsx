import { useCallback } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import VideoCard from "./VideoCard";
import VideoSkeletons from "./VideoSkeletons";
import ContentState from "./ContentState";
import Pagination from "./Pagination";
import { getVideos, searchVideos } from "../api/api";
import useResource from "../hooks/useResource";
import usePageTitle from "../hooks/usePageTitle";
import { useSavedVideos } from "../lib/libraryStore";
import { VIDEO_PAGE_SIZE } from "../lib/pagination";

export default function VideoListsPage({ mode = "library" }) {
  const [params, setParams] = useSearchParams();
  const { categories = [] } = useOutletContext() || {};
  const saved = useSavedVideos();
  const category = params.get("category") || "";
  const q = (params.get("q") || "").trim();
  const requestedOrdering = params.get("ordering");
  const ordering = [
    "-published_at",
    "-views_count",
    "-downloads_count",
    "title",
  ].includes(requestedOrdering)
    ? requestedOrdering
    : "-published_at";
  const requestedDuration = params.get("duration");
  const duration = ["short", "medium", "long"].includes(requestedDuration)
    ? requestedDuration
    : "";
  const rawPage = Number(params.get("page"));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const savedIds = saved.join(",");
  const isSearch = mode === "search";
  const isSaved = mode === "saved";
  const canLoad = !(isSearch && !q) && !(isSaved && !saved.length);
  const loader = useCallback(
    (signal) => {
      const options = {
        category,
        ordering,
        duration,
        page,
        page_size: VIDEO_PAGE_SIZE,
        ...(isSaved ? { ids: savedIds } : {}),
      };
      return isSearch
        ? searchVideos(q, options, { signal })
        : getVideos(options, { signal });
    },
    [category, ordering, duration, page, isSaved, savedIds, isSearch, q],
  );
  const resource = useResource(
    loader,
    `${mode}:${category}:${ordering}:${duration}:${page}:${q}:${isSaved ? savedIds : ""}`,
    canLoad,
  );
  const title = isSaved
    ? "Saved videos"
    : isSearch
      ? q
        ? `Results for “${q}”`
        : "Search the library"
      : category
        ? categories.find((item) => item.slug === category)?.name ||
          category.replace(/-/g, " ")
        : "The video library";
  usePageTitle(title);
  const filter = (name, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(name, value) : next.delete(name);
    next.delete("page");
    setParams(next);
  };
  const clear = () => {
    const next = new URLSearchParams();
    if (isSearch && q) next.set("q", q);
    setParams(next);
  };
  return (
    <section className="container page-section">
      <div className="page-head">
        <div>
          <p className="eyebrow">
            {isSaved
              ? "Your collection"
              : isSearch
                ? "Find your next watch"
                : "Browse & discover"}
          </p>
          <h1 className="page-title">{title}</h1>
          <p className="page-description">
            {isSaved
              ? "Your favorites, saved on this device. No account needed."
              : isSearch
                ? "Search by title, description, or category."
                : "Explore the latest videos. Find something you like, and make it a favorite."}
          </p>
        </div>
        {resource.data && (
          <p className="result-count" role="status">
            {resource.data.count}{" "}
            {resource.data.count === 1 ? "video" : "videos"}
          </p>
        )}
      </div>
      {(canLoad || !isSaved) && (
        <div className="filter-bar">
          <div className="filter-field">
            <label htmlFor="category-filter">Category</label>
            <select
              id="category-filter"
              value={category}
              onChange={(event) => filter("category", event.target.value)}
            >
              <option value="">All categories</option>
              {category &&
                !categories.some((item) => item.slug === category) && (
                  <option value={category}>
                    {category.replace(/-/g, " ")}
                  </option>
                )}
              {categories.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="sort-filter">Sort by</label>
            <select
              id="sort-filter"
              value={ordering}
              onChange={(event) => filter("ordering", event.target.value)}
            >
              <option value="-published_at">Newest first</option>
              <option value="-views_count">Most viewed</option>
              <option value="-downloads_count">Most downloaded</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="duration-filter">Duration</label>
            <select
              id="duration-filter"
              value={duration}
              onChange={(event) => filter("duration", event.target.value)}
            >
              <option value="">Any length</option>
              <option value="short">Under 10 minutes</option>
              <option value="medium">10–30 minutes</option>
              <option value="long">30 minutes or more</option>
            </select>
          </div>
          {(category || duration || ordering !== "-published_at") && (
            <button type="button" className="text-link" onClick={clear}>
              Reset filters
            </button>
          )}
        </div>
      )}
      {!canLoad ? (
        <ContentState
          title={
            isSaved
              ? "Your collection starts here"
              : "What are you looking for?"
          }
          description={
            isSaved
              ? "Tap the bookmark on any video to save it here. Saved videos stay in this browser."
              : "Use the search field in the navigation to find a video."
          }
        >
          <Link className="button button-secondary" to="/">
            Browse videos
          </Link>
        </ContentState>
      ) : resource.loading ? (
        <VideoSkeletons />
      ) : resource.error ? (
        <ContentState
          error
          title="We couldn't load the videos"
          description={
            resource.error.status === 404
              ? "This page is no longer available. Try the first page or adjust your filters."
              : "The library may be temporarily unavailable. Please try again."
          }
        >
          <button type="button" className="button" onClick={resource.retry}>
            Try again
          </button>
          {page > 1 && (
            <button
              type="button"
              className="text-link"
              onClick={() => filter("page", "")}
            >
              Go to first page
            </button>
          )}
        </ContentState>
      ) : !resource.data?.results.length ? (
        <ContentState
          title="No videos found"
          description={
            isSaved
              ? "Saved videos may have been removed, or may not match your filters."
              : "Try another search or adjust your category and duration filters."
          }
        >
          <button
            className="button button-secondary"
            type="button"
            onClick={clear}
          >
            Reset filters
          </button>
          <Link className="text-link" to="/">
            Browse all videos
          </Link>
        </ContentState>
      ) : (
        <>
          <div className="video-grid">
            {resource.data.results.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
          <Pagination data={resource.data} page={page} />
        </>
      )}
    </section>
  );
}
