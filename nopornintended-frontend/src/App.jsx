import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Homepage from "./pages/Homepage";
import DownloadsPage from "./pages/DownloadsPage";
import MainLayout from "./layout/MainLayout";
import NotFoundPage from "./pages/NotFoundPage";
import SearchPage from "./component/Search";
import ContactPage from "./pages/ContactPage";
import ReportPage from "./pages/ReportPage";
import PolicyPage from "./pages/PolicyPage";
import SavedPage from "./pages/SavedPage";
import RouteErrorPage from "./pages/RouteErrorPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Homepage /> },
      { path: "downloads/:id", element: <DownloadsPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "saved", element: <SavedPage /> },
      { path: "contact", element: <ContactPage /> },
      { path: "report", element: <ReportPage /> },
      { path: "terms", element: <PolicyPage slug="terms" /> },
      { path: "privacy", element: <PolicyPage slug="privacy" /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
export default function App() {
  return <RouterProvider router={router} />;
}
