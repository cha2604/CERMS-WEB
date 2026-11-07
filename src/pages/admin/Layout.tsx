
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FiArchive,
  FiBarChart2,
  FiBell,
  FiFileText,
  FiLogOut,
  FiMapPin,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";
import PreferencesControls from "../../components/PreferencesControls";
import { usePreferences } from "../../context/PreferencesContext";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = usePreferences();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadUnread() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) return;

      const { count } = await supabase
        .from("notifications")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (mounted) {
        setUnreadCount(count || 0);
      }
    }

    loadUnread();

    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/reports") {
      return (
        location.pathname === "/reports" ||
        location.pathname.startsWith("/report/")
      );
    }

    return location.pathname === path;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();

    navigate("/login", {
      replace: true,
    });
  };

  const navItems = [
    {
      label: "dashboard",
      path: "/dashboard",
      icon: FiBarChart2,
    },
    {
      label: "geotaggedMap",
      path: "/map",
      icon: FiMapPin,
    },
    {
      label: "reports",
      path: "/reports",
      icon: FiFileText,
    },
    {
      label: "accounts",
      path: "/users",
      icon: FiUsers,
    },
    {
      label: "staffPersonnel",
      path: "/staff",
      icon: FiUserPlus,
    },
    {
      label: "wasteWeighing",
      path: "/waste-weighing",
      icon: FiBarChart2,
    },
    {
      label: "archive",
      path: "/archive",
      icon: FiArchive,
    },
  ];

  return (
    <div className="admin-layout min-h-screen bg-slate-50 font-sans">
      <style>
        {`
          .admin-page-content aside:not(.admin-global-sidebar) {
            display: none !important;
          }

          .admin-page-content .ml-64 {
            margin-left: 0 !important;
          }

          .admin-page-content {
            min-width: 0;
          }
        `}
      </style>

      <aside className="admin-global-sidebar fixed left-0 top-0 bottom-0 z-50 w-64 bg-white border-r border-slate-200 p-5 flex flex-col shrink-0 print:hidden">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-lg shadow-md">
            C
          </div>

          <div>
            <h2 className="font-extrabold text-slate-900 text-base leading-none">
              CERMS
            </h2>

            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mt-1">
              WASTE MONITORING
            </p>
          </div>
        </div>

        <nav className="space-y-2 text-sm font-bold flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                  isActive(item.path)
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                {t(item.label)}
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <FiLogOut size={15} />
            {t("logout")}
          </button>
        </div>
      </aside>

      <main className="admin-page-content ml-64 min-h-screen min-w-0">
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-end gap-3 print:hidden">
          <PreferencesControls />

          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all"
            title={t("notifications")}
            aria-label={t("notifications")}
          >
            <FiBell size={20} />

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
