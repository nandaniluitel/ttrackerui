import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import AppLayout from "@/layout/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import RequireAuth from "./auth/RequireAuth";
import EpicsPage from "./pages/EpicsPage";

import TicketsPage from "./pages/TicketsPage";
import SprintsPage from "./pages/SprintsPage";
import BoardPage from "./pages/BoardPage";
import EpicsBoardPage from "./pages/EpicsBoardPage";
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: "board", element: <BoardPage /> },
      { path: "epics-board", element: <EpicsBoardPage /> },
      { index: true, element: <DashboardPage /> },
      { path: "tickets", element: <TicketsPage /> },
      { path: "sprints", element: <SprintsPage /> },
      { path: "epics", element: <EpicsPage /> },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
]);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
