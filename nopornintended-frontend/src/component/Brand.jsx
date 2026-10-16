import { Link } from "react-router-dom";
export default function Brand({ linked = true }) {
  const content = (
    <>
      <img src="/favicon.svg" width="38" height="38" alt="" />
      <span>
        noporn<span className="brand-accent">intended</span>
      </span>
    </>
  );
  return linked ? (
    <Link to="/" className="brand" aria-label="nopornintended home">
      {content}
    </Link>
  ) : (
    <span className="brand">{content}</span>
  );
}
