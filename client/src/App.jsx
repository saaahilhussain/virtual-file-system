import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import LandingPage from "./pages/LandingPage";
import DirectoryView from "./pages/DirectoryView";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Plans from "./pages/Plans";
import TrashView from "./pages/TrashView";
import UsersView from "./pages/UsersView";
import GitHubCallback from "./pages/GitHubCallback";
import { fetchUser } from "./apis/userApi";

function RoleGuard({ children }) {
  const [status, setStatus] = useState("loading"); // loading | allowed | denied | unauth

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        const user = await fetchUser();
        const role = String(user?.role || "")
          .trim()
          .toLowerCase();
        if (!mounted) return;

        if (["manager", "admin", "owner"].includes(role)) {
          setStatus("allowed");
        } else {
          setStatus("denied");
        }
      } catch (err) {
        if (!mounted) return;
        if (err.message === "Unauthorized") setStatus("unauth");
        else setStatus("denied");
      }
    }

    check();
    return () => {
      mounted = false;
    };
  }, []);

  if (status === "loading") return <div>Checking access...</div>;
  if (status === "unauth") return <Navigate to="/login" replace />;
  if (status === "denied") return <Navigate to="/app" replace />;
  return children;
}

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/plans", element: <Plans /> },
  { path: "/app", element: <DirectoryView /> },
  { path: "/register", element: <Register /> },
  { path: "/login", element: <Login /> },
  { path: "/app/directory/:dirId", element: <DirectoryView /> },
  { path: "/trash", element: <TrashView /> },
  {
    path: "/users",
    element: (
      <RoleGuard>
        <UsersView />
      </RoleGuard>
    ),
  },
  { path: "/auth/github/callback", element: <GitHubCallback /> },
]);

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    document.body.classList.toggle("dark-mode", savedTheme === "dark");

    if (!savedTheme) {
      localStorage.setItem("theme", "light");
    }
  }, []);

  return <RouterProvider router={router} />;
}

export default App;
