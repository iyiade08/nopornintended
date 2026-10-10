import {
  createRoutesFromChildren,
  createBrowserRouter,
  RouterProvider,
  Route,
} from "react-router-dom";
import Homepage from "./pages/Homepage";
import DownloadsPage from "./pages/DownloadsPage";
import MainLayout from "./layout/MainLayout";
import NotFoundPage from "./pages/NotFoundPage";
import SearchPage from "./component/Search";

const router = createBrowserRouter(
  createRoutesFromChildren(
    <Route path="/" element={<MainLayout />}>
      <Route index element={<Homepage />} />
      <Route path="/downloads/:id" element={<DownloadsPage />} />
      <Route path="search" element={<SearchPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>,
  ),
);

const App = () => {
  return (
    <div>
      <RouterProvider router={router} />
    </div>
  );
};

export default App;
