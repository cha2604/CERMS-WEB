import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiHome,
  FiFileText,
  FiEdit3,
  FiClock,
  FiUser,
  FiLogOut,
  FiBell,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

const NAV_ITEMS = [
  { label: "Dashboard", icon: FiHome, to: "/dashboard" },
  { label: "Reports", icon: FiFileText, to: "/my-reports" },
  { label: "Draft Reports", icon: FiEdit3, to: "/drafts" },
  { label: "History", icon: FiClock, to: "/history" },
  { label: "Notifications", icon: FiBell, to: "/notifications" },
  { label: "Profile", icon: FiUser, to: "/profile" },
];

export default function ResidentLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileName, setProfileName] = useState<string>("");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (data?.full_name) {
          setProfileName(data.full_name);
        }

        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false);

        setUnreadCount(count || 0);
      }
    }

    loadData();
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col relative">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all focus:outline-none"
            title="Toggle Navigation Menu"
          >
            <FiMenu size={22} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-black text-lg shadow-md">
              C
            </div>

            <h1 className="font-extrabold text-slate-900 text-xl tracking-tight">
              CERMS
            </h1>
          </div>
        </div>

        <Link
          to="/notifications"
          className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all"
          title="Notifications"
        >
          <FiBell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white">
              {unreadCount}
            </span>
          )}
        </Link>
      </header>

      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 bg-emerald-100/95 backdrop-blur-md border-r border-emerald-200 p-6 flex flex-col justify-between z-50 transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-emerald-200/60">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-black text-xl shadow-md">
                C
              </div>

              <div>
                <h2 className="font-extrabold text-slate-900 text-lg">
                  CERMS
                </h2>

                <p className="text-[11px] text-emerald-900 font-bold">
                  Barangay Tankulan
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="p-2 rounded-xl text-slate-600 hover:bg-emerald-200/50 transition-all"
            >
              <FiX size={20} />
            </button>
          </div>

          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsDrawerOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-extrabold text-sm transition-all ${
                    isActive
                      ? "bg-emerald-800 text-white shadow-md"
                      : "text-slate-800 hover:bg-emerald-200/60 hover:text-emerald-950"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>

                  {item.label === "Notifications" && unreadCount > 0 && (
                    <span className="ml-auto bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-emerald-200/60 space-y-4">
          <div className="bg-white/60 rounded-2xl p-3.5 border border-emerald-200/80">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Logged in as
            </p>

            <p className="text-sm font-black text-slate-900 truncate">
              {profileName || "Resident User"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm transition-all"
          >
            <FiLogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl w-full mx-auto">
        <Outlet context={{ profileName }} />
      </main>
    </div>
  );
}