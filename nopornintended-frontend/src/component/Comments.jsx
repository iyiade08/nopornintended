import { useCallback, useState } from "react";
import { getComments, sendComment } from "../api/api";
import useResource from "../hooks/useResource";
import useSubmission from "../hooks/useSubmission";
import Field from "./Field";
import Spinner from "./Spinner";

export default function Comments({ videoId }) {
  const [page, setPage] = useState(1);
  const loader = useCallback(
    (signal) => getComments(videoId, page, { signal }),
    [videoId, page],
  );
  const resource = useResource(loader, `comments:${videoId}:${page}`);
  const send = (data) => sendComment(videoId, data);
  const { busy, success, error, fields, submit, focusError, reset } =
    useSubmission(send);
  return (
    <section className="comments-section" aria-labelledby="comments-title">
      <h2 className="section-heading" id="comments-title">
        Comments{resource.data ? ` (${resource.data.count})` : ""}
      </h2>
      <form
        className="form-card form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          submit(Object.fromEntries(new FormData(event.currentTarget)));
        }}
      >
        <p className="field-hint">
          Share your thoughts. Comments are reviewed before they appear
          publicly.
        </p>
        {error && (
          <p ref={focusError} tabIndex={-1} role="alert" className="error-text">
            {error}
          </p>
        )}
        {success ? (
          <>
            <p
              className="success-text"
              role="status"
              tabIndex={-1}
              ref={focusError}
            >
              Thank you. Your comment has been submitted for review.
            </p>
            <button
              className="button button-secondary"
              type="button"
              onClick={reset}
            >
              Write another comment
            </button>
          </>
        ) : (
          <>
            <Field
              label="Display name"
              name="name"
              required
              minLength={2}
              maxLength={80}
              autoComplete="nickname"
              error={fields.name}
            />
            <Field
              label="Your comment"
              name="body"
              as="textarea"
              required
              minLength={3}
              maxLength={2000}
              error={fields.body}
              hint="Up to 2,000 characters. Your display name and approved comment will be public."
            />
            <div>
              <button className="button" type="submit" disabled={busy}>
                {busy ? "Submitting…" : "Post comment"}
              </button>
            </div>
          </>
        )}
      </form>
      {resource.loading ? (
        <Spinner label="Loading comments…" slow={resource.slow} />
      ) : resource.error ? (
        <div className="action-message" role="alert">
          <p>Comments couldn't be loaded.</p>
          <button type="button" className="text-link" onClick={resource.retry}>
            Try again
          </button>
        </div>
      ) : !resource.data?.results.length ? (
        <p className="action-message">
          No comments yet. Be the first to share your thoughts.
        </p>
      ) : (
        <div className="comment-list">
          {resource.data.results.map((comment) => {
            const date = new Date(comment.created_at);
            return (
              <article className="comment" key={comment.id}>
                <div className="comment-head">
                  <strong>{comment.name}</strong>
                  {!Number.isNaN(date.getTime()) && (
                    <time dateTime={comment.created_at}>
                      {date.toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  )}
                </div>
                <p>{comment.body}</p>
              </article>
            );
          })}
        </div>
      )}
      {(resource.data?.next || resource.data?.previous) && (
        <nav className="pagination" aria-label="Comment pages">
          <button
            className="button button-secondary"
            type="button"
            disabled={!resource.data.previous}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="button button-secondary"
            type="button"
            disabled={!resource.data.next}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
