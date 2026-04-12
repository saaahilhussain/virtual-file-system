import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import DirectoryView from "./pages/DirectoryView";
import Register from "./pages/Register";
import Login from "./pages/Login";
import TrashView from "./pages/TrashView";
import UsersView from "./pages/UsersView";
import GitHubCallback from "./pages/GitHubCallback";
const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/app",
    element: <DirectoryView />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/app/directory/:dirId",
    element: <DirectoryView />,
  },
  {
    path: "/trash",
    element: <TrashView />,
  },
  {
    path: "/users",
    element: <UsersView />,
  },
  {
    path: "/auth/github/callback",
    element: <GitHubCallback />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
