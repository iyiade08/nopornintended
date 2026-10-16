import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../component/Navbar";
import Footer from "../component/Footer";
import AgeGate from "../component/AgeGate";
import useResource from "../hooks/useResource";
import { getCategories } from "../api/api";

function SiteLayout() {
  const categories = useResource(getCategories, "categories");
  const location = useLocation();
  const firstRoute = useRef(true);
  const mainRef = useRef(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (!firstRoute.current) mainRef.current?.focus({ preventScroll: true });
    firstRoute.current = false;
  }, [location.pathname, location.search]);
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Navbar
        categories={categories.data || []}
        categoriesLoading={categories.loading}
        categoriesError={categories.error}
        retryCategories={categories.retry}
      />
      <main id="main-content" className="site-main" ref={mainRef} tabIndex={-1}>
        <Outlet context={{ categories: categories.data || [] }} />
      </main>
      <Footer />
    </div>
  );
}
export default function MainLayout() {
  const { pathname } = useLocation();
  const publicPage = ["/terms", "/privacy", "/contact", "/report"].includes(
    pathname.replace(/\/$/, ""),
  );
  return publicPage ? (
    <SiteLayout />
  ) : (
    <AgeGate>
      <SiteLayout />
    </AgeGate>
  );
}
