import { Link } from "react-router-dom";
import Brand from "./Brand";
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Brand />
            <p className="footer-copy">
              Browse, discover, and save your favorites. This website is
              intended for adults aged 18 and over.
            </p>
          </div>
          <nav className="footer-nav" aria-label="Footer navigation">
            <Link to="/">Video library</Link>
            <Link to="/saved">Saved videos</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/report">Report content</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} nopornintended. All rights reserved.
          </p>
          <span className="age-badge">18+ · Adults only</span>
        </div>
      </div>
    </footer>
  );
}
