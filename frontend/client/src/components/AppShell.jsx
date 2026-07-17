import { BarChart3, Clock3, LayoutDashboard, LogOut, Menu, Settings, Users, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/authSlice";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "groups", label: "Groups", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "activity", label: "Activity", icon: Clock3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AppShell({ page, setPage, children }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f6f8f4] lg:grid lg:grid-cols-[280px_1fr]">
      <button
        className="focus-ring fixed left-4 top-4 z-30 rounded-md bg-ink p-2 text-white lg:hidden"
        onClick={() => setOpen(true)}
        title="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-ink/10 bg-white p-5 transition lg:sticky lg:top-0 lg:h-screen ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WalletCards className="h-8 w-8 text-mint" />
            <div>
              <div className="text-xl font-black">SplitStream</div>
              <div className="text-xs font-semibold text-ink/45">Real-time expenses</div>
            </div>
          </div>
          <button className="focus-ring rounded-md p-2 lg:hidden" onClick={() => setOpen(false)} title="Close navigation">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`focus-ring flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-black ${
                  page === item.id ? "bg-ink text-white" : "text-ink/65 hover:bg-ink/5 hover:text-ink"
                }`}
                onClick={() => {
                  setPage(item.id);
                  setOpen(false);
                }}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-ink/10 pt-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mint text-sm font-black text-white">
              {user?.name?.slice(0, 1)?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black">{user?.name}</div>
              <div className="truncate text-xs text-ink/50">{user?.email}</div>
            </div>
          </div>
          <button
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-md border border-ink/10 px-3 py-2 text-sm font-bold hover:bg-ink hover:text-white"
            onClick={() => dispatch(logout())}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} />}
      <main className="min-w-0 px-4 py-6 pt-16 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
    </div>
  );
}
