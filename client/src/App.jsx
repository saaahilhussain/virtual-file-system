import { createBrowserRouter, RouterProvider } from "react-router-dom";
import DirectoryView from "./pages/DirectoryView";
import Register from "./pages/Register";
import Login from "./pages/Login";
import TrashView from "./pages/TrashView";

const router = createBrowserRouter([
  {
    path: "/",
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
    path: "/directory/:dirId",
    element: <DirectoryView />,
  },
  {
    path: "/trash",
    element: <TrashView />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
