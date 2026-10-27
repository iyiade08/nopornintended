import { useCallback } from "react";
import { Link } from "react-router-dom";
import { getPage } from "../api/api";
import useResource from "../hooks/useResource";
import usePageTitle from "../hooks/usePageTitle";
import Spinner from "../component/Spinner";
import ContentState from "../component/ContentState";

export default function PolicyPage({ slug }) {
  const fallbackTitle = slug === "privacy" ? "Privacy Policy" : "Terms of Use";
  const loader = useCallback((signal) => getPage(slug, { signal }), [slug]);
  const resource = useResource(loader, slug);
  usePageTitle(resource.data?.title || fallbackTitle);
  const updated = resource.data?.updated_at
    ? new Date(resource.data.updated_at)
    : null;
  return (
    <section className="narrow-container page-section">
      <div className="page-head">
        <div>
          <p className="eyebrow">Information</p>
          <h1 className="page-title">
            {resource.data?.title || fallbackTitle}
          </h1>
          {updated && !Number.isNaN(updated.getTime()) && (
            <p className="policy-date">
              Last updated{" "}
              {updated.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>
      </div>
      {resource.loading ? (
        <Spinner label="Loading page…" slow={resource.slow} />
      ) : resource.error ? (
        <ContentState
          error={resource.error.status !== 404}
          title={
            resource.error.status === 404
              ? "This policy hasn't been published yet"
              : "We couldn't load this page"
          }
          description={
            resource.error.status === 404
              ? "Please check back later, or contact the team with any questions."
              : "Please try again in a moment."
          }
        >
          {resource.error.status !== 404 && (
            <button type="button" className="button" onClick={resource.retry}>
              Try again
            </button>
          )}
          <Link to="/contact" className="text-link">
            Contact the team
          </Link>
        </ContentState>
      ) : (
        <div className="form-card policy-body">{resource.data?.body}</div>
      )}
    </section>
  );
}
