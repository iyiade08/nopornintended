import { useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  FaThumbsUp,
  FaThumbsDown,
  FaBookmark,
  FaRegBookmark,
} from "react-icons/fa";
import { voteVideo } from "../api/api";
import { formatCount } from "../lib/media";
import {
  getVisitorId,
  storedVote,
  toggleSaved,
  updateFeedback,
  useSavedVideos,
  useVideoFeedback,
} from "../lib/libraryStore";

export default function VideoFeedback({ video }) {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const saved = useSavedVideos();
  const feedback = useVideoFeedback(video.id);
  const value = feedback?.value ?? storedVote(video.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isSaved = saved.includes(String(video.id));
  const vote = async (selection) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await voteVideo(video.id, {
        visitor_id: getVisitorId(),
        value: value === selection ? 0 : selection,
      });
      updateFeedback(video.id, result);
    } catch {
      setError("Your vote couldn't be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <div className="card-actions" aria-label="Video feedback">
        <button
          type="button"
          className="vote-button"
          aria-label={`Thumbs up: ${feedback?.likes_count ?? video.likes_count ?? 0}`}
          aria-pressed={value === 1}
          disabled={busy}
          onClick={() => vote(1)}
        >
          <FaThumbsUp aria-hidden="true" />
          <span>{formatCount(feedback?.likes_count ?? video.likes_count)}</span>
        </button>
        <button
          type="button"
          className="vote-button"
          aria-label={`Thumbs down: ${feedback?.dislikes_count ?? video.dislikes_count ?? 0}`}
          aria-pressed={value === -1}
          disabled={busy}
          onClick={() => vote(-1)}
        >
          <FaThumbsDown aria-hidden="true" />
          <span>
            {formatCount(feedback?.dislikes_count ?? video.dislikes_count)}
          </span>
        </button>
        <button
          type="button"
          className="vote-button save-button"
          aria-label={isSaved ? "Remove from saved videos" : "Save video"}
          aria-pressed={isSaved}
          onClick={() => {
            setError("");
            try {
              toggleSaved(video.id);
              if (
                isSaved &&
                location.pathname === "/saved" &&
                params.has("page")
              ) {
                const next = new URLSearchParams(params);
                next.delete("page");
                setParams(next, { replace: true });
              }
            } catch (err) {
              setError(err.message);
            }
          }}
        >
          {isSaved ? (
            <FaBookmark aria-hidden="true" />
          ) : (
            <FaRegBookmark aria-hidden="true" />
          )}
        </button>
      </div>
      {error && (
        <p className="feedback-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
