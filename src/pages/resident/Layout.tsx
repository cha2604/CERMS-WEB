
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
import PreferencesControls from "../../components/PreferencesControls";
import { usePreferences } from "../../context/PreferencesContext";

export default function ResidentLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = usePreferences();

  const [profileName, setProfileName] = useState<string>("");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const NAV_ITEMS = [
    { label: "dashboard", icon: FiHome, to: "/dashboard" },
    { label: "reports", icon: FiFileText, to: "/my-reports" },
    { label: "draftReports", icon: FiEdit3, to: "/drafts" },
    { label: "history", icon: FiClock, to: "/history" },
    { label: "profile", icon: FiUser, to: "/profile" },
  ];

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (mounted && data?.full_name) {
        setProfileName(data.full_name);
      }

      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (mounted) {
        setUnreadCount(count || 0);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen w-full min-w-0 flex-col bg-slate-50 font-sans">
      <header className="sticky top-0 z-30 flex min-h-[64px] w-full min-w-0 box-border items-center justify-between gap-2 border-b border-slate-200 bg-white px-2 py-3 shadow-sm sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800 transition-all hover:bg-slate-200 sm:h-10 sm:w-10"
            title="Toggle Navigation Menu"
            aria-label="Toggle Navigation Menu"
          >
            <FiMenu size={21} />
          </button>

          <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
            CERMS
          </h1>
        </div>

        <div className="ml-auto flex shrink-0 items-center justify-end gap-1 sm:gap-2">
          <PreferencesControls />

          <Link
            to="/notifications"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800 transition-all hover:bg-slate-200 sm:h-10 sm:w-10"
            title={t("notifications")}
            aria-label={t("notifications")}
          >
            <FiBell size={20} />

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-black text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {isDrawerOpen && (
        <button
          type="button"
          onClick={() => setIsDrawerOpen(false)}
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-72 flex-col justify-between border-r border-emerald-200 bg-emerald-100/95 p-6 backdrop-blur-md transition-transform duration-300 ease-in-out ${
          isDrawerOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-emerald-200/60 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                CERMS
              </h2>

              <p className="text-[11px] font-bold text-emerald-900">
                {t("barangayTankulan")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="rounded-xl p-2 text-slate-600 transition-all hover:bg-emerald-200/50"
              aria-label="Close menu"
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
                  className={`flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-sm font-extrabold transition-all ${
                    isActive
                      ? "bg-emerald-800 text-white shadow-md"
                      : "text-slate-800 hover:bg-emerald-200/60 hover:text-emerald-950"
                  }`}
                >
                  <Icon size={20} />
                  <span>{t(item.label)}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4 border-t border-emerald-200/60 pt-6">
          <div className="rounded-2xl border border-emerald-200/80 bg-white/60 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t("loggedInAs")}
            </p>

            <p className="truncate text-sm font-black text-slate-900">
              {profileName || "Resident User"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-rose-700"
          >
            <FiLogOut size={16} />
            <span>{t("signOut")}</span>
          </button>
        </div>
      </aside>

      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 p-4 sm:p-6 md:p-8">
        <Outlet context={{ profileName }} />
      </main>
    </div>
  );
}
