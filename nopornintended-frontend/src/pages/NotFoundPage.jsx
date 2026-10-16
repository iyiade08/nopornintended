import { Link } from "react-router-dom";
import ContentState from "../component/ContentState";
import usePageTitle from "../hooks/usePageTitle";
export default function NotFoundPage() {
  usePageTitle("Page not found");
  return (
    <section className="narrow-container page-section">
      <ContentState
        heading="h1"
        title="This page couldn't be found"
        description="The link may be out of date, or the page may have moved."
      >
        <p>404 · Page not found</p>
        <Link className="button" to="/">
          Back to the library
        </Link>
      </ContentState>
    </section>
  );
}
