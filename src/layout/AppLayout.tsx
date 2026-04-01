import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getRole, logout } from "@/lib/auth";
import { useState } from "react";
import { Menu, UserCircle } from "lucide-react";

function NavItem({
  to,
  label,
  collapsed,
}: {
  to: string;
  label: string;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        [
          "block rounded-md px-3 py-2 text-sm transition",
          isActive
            ? "bg-violet-50 text-violet-700 border-l-2 border-violet-600"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
          collapsed ? "text-transparent select-none" : "",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

export default function AppLayout() {
  const nav = useNavigate();
  const role = getRole();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function handleLogout() {
    logout();
    nav("/login");
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden shrink-0 ${
          sidebarOpen ? "w-[260px]" : "w-12"
        }`}
      >
        {/* Logo */}
        <div className="h-16 px-2 flex items-center border-b border-gray-200 shrink-0 overflow-hidden">
          {sidebarOpen && (
            <svg
              width="200"
              viewBox="0 0 680 220"
              xmlns="http://www.w3.org/2000/svg"
            >
              <style>
                {`.logo-base { font-family: Arial, sans-serif; font-weight: 500; font-size: 52px; letter-spacing: -1px; }
                .logo-highlight { fill: #7c3aed; }
                .logo-dim { fill: #888; }
                .logo-rest { fill: #111; }
                .logo-sub { font-family: Arial, sans-serif; font-weight: 400; font-size: 12px; fill: #888; letter-spacing: 3.5px; }`}
              </style>
              <text x="5" y="128" className="logo-base">
                <tspan className="logo-highlight">T</tspan>
                <tspan className="logo-rest">t</tspan>
                <tspan className="logo-rest">racker</tspan>
              </text>
              <text x="5" y="155" className="logo-sub">
                ISSUE TRACKING
              </text>
            </svg>
          )}
        </div>

        {/* Nav Items */}
        <div className="p-2 space-y-6 mt-2">
          <div className="space-y-1">
            {sidebarOpen && (
              <div className="px-3 text-xs font-semibold text-gray-400 tracking-wider mb-2">
                WORK
              </div>
            )}
            <NavItem to="/" label="Dashboard" collapsed={!sidebarOpen} />
            <NavItem
              to="/board"
              label="Sprint Board"
              collapsed={!sidebarOpen}
            />
            <NavItem
              to="/epics-board"
              label="Epics Board"
              collapsed={!sidebarOpen}
            />
            <NavItem to="/tickets" label="Tickets" collapsed={!sidebarOpen} />
            <NavItem to="/sprints" label="Sprints" collapsed={!sidebarOpen} />
            <NavItem to="/epics" label="Epics" collapsed={!sidebarOpen} />
            {role === "ADMIN" && (
              <NavItem to="/users" label="Users" collapsed={!sidebarOpen} />
            )}
          </div>

          {sidebarOpen && (
            <div className="space-y-2">
              <div className="px-3 text-xs font-semibold text-gray-400 tracking-wider mb-2">
                ACTIONS
              </div>
              {role === "ADMIN" || role === "SCRUM_MASTER" ? (
                <Button
                  variant="outline"
                  className="w-full justify-start border-gray-200 text-gray-600 hover:bg-gray-100 bg-transparent"
                >
                  Manage Sprints
                </Button>
              ) : null}
              <Button className="w-full justify-start bg-violet-600 hover:bg-violet-700 text-white">
                Create Ticket
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="h-14 border-b bg-white px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md hover:bg-gray-100 transition text-gray-500"
            >
              <Menu size={18} />
            </button>
            <div className="text-sm font-medium text-gray-400">Workspace</div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              {role ?? "Unknown"}
            </span>
            <NavLink
              to="/profile"
              className="p-1.5 rounded-md hover:bg-gray-100 transition text-gray-500"
            >
              <UserCircle size={20} />
            </NavLink>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 border-gray-200 hover:bg-gray-100"
            >
              Logout
            </Button>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
