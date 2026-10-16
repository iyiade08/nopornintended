import ContentState from "../component/ContentState";
export default function RouteErrorPage() {
  return (
    <main className="narrow-container page-section">
      <ContentState
        heading="h1"
        error
        title="Something went wrong"
        description="Please reload the page and try again."
      >
        <a href="/" className="button">
          Return to the library
        </a>
      </ContentState>
    </main>
  );
}
