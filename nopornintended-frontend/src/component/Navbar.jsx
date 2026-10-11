import logo from "../assets/nav-logo/nopornintended-icon-transparent.png";
import { useState, useEffect } from "react";
import { FaBars, FaTimes, FaSearch } from "react-icons/fa";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getCategories } from "../api/api";

const Navbar = () => {
  const [isScroll, setIsScroll] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeCategory = searchParams.get("category");
  const [query, setQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    const handleScroll = () => {
      setIsScroll(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load the nav links from the API
  useEffect(() => {
    let ignore = false;

    const loadCategories = async () => {
      try {
        const data = await getCategories();
        if (!ignore) setCategories(data);
      } catch (err) {
        // The navbar should never break the page, so just show no links
        console.error("Could not load categories", err);
        if (!ignore) setCategories([]);
      }
    };

    loadCategories();

    return () => {
      ignore = true;
    };
  }, []);

  // Enter key or search icon -> /search?q=term
  const handleSearch = (e) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    navigate(`/search?q=${encodeURIComponent(term)}`);
    setIsOpen(false);
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 w-full px-2 border-b border-white/20 transition-all duration-500 ${
        isScroll || isOpen
          ? "bg-[#130F1E]/80 backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <nav className="flex w-full items-center justify-between gap-4 px-2 py-2">
        {/* logo */}
        <div className="flex items-center">
          <Link to="/">
            <img
              src={logo}
              alt="nopornintended logo"
              className="max-w-[3.5rem] lg:max-w-[4vw] md:max-w-[5vw] w-full"
            />
          </Link>
          <Link to="/">
            <p className="font-poppins text-3xl md:text-5xl tracking-tight bg-gradient-to-br from-[#FD3E81] via-[#CB4CB5] to-[#895CF5] bg-clip-text text-transparent pt-3 ">
              n<span className="capitalize">opornintended</span>
            </p>
          </Link>
        </div>

        {/* search bar (desktop) */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex items-center gap-2 p-2 rounded-lg border border-slate-500/50 focus-within:border-[#CB4CB5] transition-colors"
        >
          <button
            type="submit"
            aria-label="Search"
            className="border-r border-slate-500/50 pr-2 text-slate-300 hover:text-white"
          >
            <FaSearch className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="input your text"
            className="min-w-0 flex-1 bg-transparent p-2 text-[16px] text-white placeholder:text-slate-400 outline-none"
          />
        </form>

        {/* desktop nav */}
        <ul className="hidden md:flex capitalize text-white/90 font-poppins font-semibold text-xl lg:text-2xl gap-4 lg:gap-8">
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                to={`/?category=${cat.slug}`}
                className={`transition-colors hover:text-white ${
                  activeCategory === cat.slug ? "text-[#CB4CB5]" : ""
                }`}
              >
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>

        {/* mobile toggle */}
        <button
          className="md:hidden flex"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? (
            <FaTimes size={24} className="text-white/90" />
          ) : (
            <FaBars size={24} className="text-white/90" />
          )}
        </button>
      </nav>

      {/* mobile nav */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#130F1E]/95 backdrop-blur-md border-b animate-fade-in glass-strong z-10 border-white/20">
          <div className="flex flex-col items-center gap-4 px-6 py-6">
            {/* search bar (mobile) */}
            <form
              onSubmit={handleSearch}
              className="flex w-full items-center gap-2 p-2 rounded-lg border border-slate-500/50 focus-within:border-[#CB4CB5] transition-colors"
            >
              <button
                type="submit"
                aria-label="Search"
                className="border-r border-slate-500/50 pr-2 text-slate-300 hover:text-white"
              >
                <FaSearch className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="input your text"
                className="min-w-0 flex-1 bg-transparent p-2 text-[16px] text-white placeholder:text-slate-400 outline-none"
              />
            </form>

            <ul className="flex flex-col gap-4 capitalize text-white/90 items-center font-poppins font-semibold text-2xl">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/?category=${cat.slug}`}
                    onClick={() => setIsOpen(false)}
                    className={
                      activeCategory === cat.slug ? "text-[#CB4CB5]" : ""
                    }
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
