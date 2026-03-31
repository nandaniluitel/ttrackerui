import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getRole, logout } from "@/lib/auth";
import { useState } from "react";
import { Menu, X } from "lucide-react";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        [
          "block rounded-md px-3 py-2 text-sm transition",
          isActive
            ? "bg-muted text-foreground font-medium"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
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
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`border-r bg-background flex flex-col transition-all duration-300 overflow-hidden ${
          sidebarOpen ? "w-[260px]" : "w-0"
        }`}
      >
        <div className="h-16 px-4 flex items-center border-b shrink-0">
          <svg
            width="200"
            viewBox="0 0 680 220"
            xmlns="http://www.w3.org/2000/svg"
          >
            <style>
              {`.logo-dim { font-family: Arial, sans-serif; font-weight: 500; font-size: 52px; fill: #888; letter-spacing: -1px; }
                .logo-highlight { font-family: Arial, sans-serif; font-weight: 500; font-size: 52px; fill: #7c3aed; letter-spacing: -1px; }
                .logo-rest { font-family: Arial, sans-serif; font-weight: 500; font-size: 52px; fill: #111; letter-spacing: -1px; }
                .logo-sub { font-family: Arial, sans-serif; font-weight: 400; font-size: 12px; fill: #888; letter-spacing: 3.5px; }`}
            </style>
            <text x="5" y="128" className="logo-highlight">
              T
            </text>
            <text x="36" y="128" className="logo-dim">
              t
            </text>
            <text x="59" y="128" className="logo-rest">
              racker
            </text>
            <text x="5" y="155" className="logo-sub">
              ISSUE TRACKING
            </text>
          </svg>
          <NavItem to="/profile" label="Profile" />
        </div>

        <div className="p-3 space-y-6">
          <div className="space-y-1">
            <div className="px-3 text-xs font-semibold text-muted-foreground">
              WORK
            </div>
            <NavItem to="/" label="Dashboard" />
            <NavItem to="/board" label="Sprint Board" />
            <NavItem to="/epics-board" label="Epics Board" />
            <NavItem to="/tickets" label="Tickets" />
            <NavItem to="/sprints" label="Sprints" />
            <NavItem to="/epics" label="Epics" />
            {role === "ADMIN" && <NavItem to="/users" label="Users" />}
          </div>

          <div className="space-y-2">
            <div className="px-3 text-xs font-semibold text-muted-foreground">
              ACTIONS
            </div>
            {role === "ADMIN" || role === "SCRUM_MASTER" ? (
              <Button variant="outline" className="w-full justify-start">
                Manage Sprints
              </Button>
            ) : null}
            <Button className="w-full justify-start">Create Ticket</Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="h-14 border-b bg-muted px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md hover:bg-muted-foreground/10 transition"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="text-sm text-muted-foreground">Workspace</div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Role: {role ?? "Unknown"}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
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
