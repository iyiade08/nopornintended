import { useEffect, useRef, useState } from "react";
import Brand from "./Brand";
import { Link } from "react-router-dom";
export default function AgeGate({ children }) {
  const [confirmed, setConfirmed] = useState(() => {
    try {
      return localStorage.getItem("age-confirmed") === "true";
    } catch {
      return false;
    }
  });
  const enterRef = useRef(null);
  useEffect(() => {
    if (!confirmed) enterRef.current?.focus();
  }, [confirmed]);
  if (confirmed) return children;
  return (
    <main className="age-screen">
      <div
        className="age-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-gate-title"
        aria-describedby="age-gate-description"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const focusable =
            event.currentTarget.querySelectorAll("button, a[href]");
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          }
          if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <Brand linked={false} />
        <span className="age-emblem" aria-hidden="true">
          18+
        </span>
        <h1 id="age-gate-title">Adults only</h1>
        <p id="age-gate-description">
          This website contains adult content. You must be 18 or older, or meet
          the legal age in your location, to enter.
        </p>
        <div className="age-actions">
          <button
            ref={enterRef}
            className="button"
            type="button"
            onClick={() => {
              try {
                localStorage.setItem("age-confirmed", "true");
              } catch {
                /* Retain confirmation for this session if storage is blocked. */
              }
              setConfirmed(true);
            }}
          >
            I am 18 or older · Enter
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => window.location.replace("https://www.google.com")}
          >
            Leave this website
          </button>
        </div>
        <p className="age-note">
          Please leave if you do not meet the age requirement.
        </p>
        <nav className="gate-links" aria-label="Site information">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </div>
    </main>
  );
}
