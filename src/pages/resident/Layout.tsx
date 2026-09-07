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
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

const NAV_ITEMS = [
  { label: "Dashboard", icon: FiHome, to: "/dashboard" },
  { label: "Reports", icon: FiFileText, to: "/my-reports" },
  { label: "Draft Reports", icon: FiEdit3, to: "/drafts" },
  { label: "History", icon: FiClock, to: "/history" },
  { label: "Profile", icon: FiUser, to: "/profile" },
];

export default function ResidentLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileName, setProfileName] = useState<string>("");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    async function loadProfile() {
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
      }
    }

    loadProfile();
  }, []);

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

              <h2 className="font-extrabold text-slate-900 text-xl tracking-tight">
                CERMS
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="p-2 rounded-xl text-slate-700 hover:bg-emerald-200/60 transition-all"
            >
              <FiX size={22} />
            </button>
          </div>

          <nav className="space-y-1.5 text-sm font-bold">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              const active =
                location.pathname === item.to ||
                (item.to === "/my-reports" &&
                  location.pathname.startsWith("/report/"));

              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setIsDrawerOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all ${
                    active
                      ? "bg-emerald-300/90 text-emerald-950 shadow-sm"
                      : "text-slate-700 hover:bg-emerald-200/60"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-rose-100 hover:text-rose-700 transition-all border-t border-emerald-200/60"
        >
          <FiLogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
        <Outlet context={{ profileName }} />
      </main>
    </div>
  );
}