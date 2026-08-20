import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiHome,
  FiFilePlus,
  FiFileText,
  FiEdit3,
  FiUser,
  FiLogOut,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

const NAV_ITEMS = [
  { label: "Dashboard", icon: FiHome, to: "/dashboard" },
  { label: "Submit Report", icon: FiFilePlus, to: "/report/new" },
  { label: "My Reports", icon: FiFileText, to: "/reports" },
  { label: "Draft Reports", icon: FiEdit3, to: "/reports/drafts" },
  { label: "Profile", icon: FiUser, to: "/profile" },
];

interface ResidentLayoutProps {
  title: string;
  children: ReactNode;
  headerRight?: ReactNode;
}

export default function ResidentLayout({
  title,
  children,
  headerRight,
}: ResidentLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="flex items-center justify-between bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="rounded-full p-2 text-green-700 transition hover:bg-green-50"
          >
            <FiMenu size={22} />
          </button>
          <h1 className="text-lg font-bold text-slate-800">{title}</h1>
        </div>
        {headerRight}
      </div>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white shadow-xl transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <FiMenu size={20} className="text-green-700" />
            <span className="text-xl font-bold text-green-800">CERMS</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100"
          >
            <FiX size={20} />
          </button>
        </div>

        <nav className="mt-2 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-green-100 text-green-800"
                    : "text-slate-700 hover:bg-green-50"
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <FiLogOut size={20} />
            Logout
          </button>
        </nav>
      </aside>

      <main>{children}</main>
    </div>
  );
}