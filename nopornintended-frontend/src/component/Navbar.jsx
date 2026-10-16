import { useEffect, useRef, useState } from "react";
import { FaBookmark, FaSearch, FaTimes } from "react-icons/fa";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import Brand from "./Brand";

function SearchForm({ initialQuery, inputRef, onSearch }) {
  const [query, setQuery] = useState(initialQuery);
  const navigate = useNavigate();
  return (
    <form
      className="search-form"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        if (!query.trim()) {
          inputRef?.current?.focus();
          return;
        }
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
        onSearch?.();
      }}
    >
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search videos"
        placeholder="Search videos…"
        maxLength={200}
      />
      <button className="icon-button" type="submit" aria-label="Submit search">
        <FaSearch aria-hidden="true" size={15} />
      </button>
    </form>
  );
}
function MobileSearch({ query }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const toggleRef = useRef(null);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    const media = window.matchMedia("(min-width: 768px)");
    const resize = (event) => {
      if (event.matches) setOpen(false);
    };
    media.addEventListener("change", resize);
    return () => {
      window.removeEventListener("keydown", close);
      media.removeEventListener("change", resize);
    };
  }, [open]);
  return (
    <>
      <button
        ref={toggleRef}
        className="icon-button mobile-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="mobile-search"
        aria-label={open ? "Close search" : "Open search"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <FaTimes aria-hidden="true" />
        ) : (
          <FaSearch aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="mobile-search container" id="mobile-search">
          <SearchForm
            initialQuery={query}
            inputRef={inputRef}
            onSearch={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
}
export default function Navbar({
  categories = [],
  categoriesLoading,
  categoriesError,
  retryCategories,
}) {
  const [params] = useSearchParams();
  const location = useLocation();
  const category = params.get("category") || "";
  const query = params.get("q") || "";
  const onLibrary = location.pathname === "/";
  return (
    <header className="site-header">
      <div className="container nav-main">
        <Brand />
        <div className="desktop-search">
          <SearchForm key={query} initialQuery={query} />
        </div>
        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/" end className="nav-library">
            Library
          </NavLink>
          <NavLink to="/saved" aria-label="Saved videos">
            <FaBookmark aria-hidden="true" size={13} />
            <span className="saved-label">Saved</span>
          </NavLink>
        </nav>
        <span className="age-badge">18+</span>
        <MobileSearch key={location.key} query={query} />
      </div>
      <div className="category-bar">
        <nav
          className="container category-scroll"
          aria-label="Video categories"
        >
          <Link
            className="category-link"
            to="/"
            aria-current={onLibrary && !category ? "page" : undefined}
          >
            All videos
          </Link>
          {categories.map((item) => (
            <Link
              key={item.id}
              className="category-link"
              to={`/?category=${encodeURIComponent(item.slug)}`}
              aria-current={
                onLibrary && category === item.slug ? "page" : undefined
              }
            >
              {item.name}
            </Link>
          ))}
          {categoriesLoading && (
            <span className="category-status" role="status">
              Loading categories…
            </span>
          )}
          {categoriesError && (
            <button
              type="button"
              className="category-link"
              onClick={retryCategories}
            >
              Retry categories
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
