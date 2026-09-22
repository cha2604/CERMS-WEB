import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FiArchive,
  FiBarChart2,
  FiCheckCircle,
  FiFileText,
  FiLogOut,
  FiMapPin,
  FiUsers,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [pendingApprovals, setPendingApprovals] =
    useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadPendingApprovals() {
      try {
        const { count, error } =
          await supabase
            .from("resident_approvals")
            .select("user_id", {
              count: "exact",
              head: true,
            })
            .eq("status", "pending");

        if (!error && mounted) {
          setPendingApprovals(count || 0);
        }
      } catch (error) {
        console.error(
          "Failed to load pending approvals:",
          error
        );
      }
    }

    loadPendingApprovals();

    const interval = window.setInterval(
      loadPendingApprovals,
      30000
    );

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const isActive = (
    path: string
  ) => {
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
          <button
            type="button"
            onClick={() =>
              navigate("/dashboard")
            }
            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
              isActive("/dashboard")
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FiBarChart2 size={16} />
            Dashboard
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/map")
            }
            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
              isActive("/map")
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FiMapPin size={16} />
            Geotagged Map
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/reports")
            }
            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
              isActive("/reports")
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FiFileText size={16} />
            Reports
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/users")
            }
            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
              isActive("/users")
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FiUsers size={16} />
            Accounts
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/approval")
            }
            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${
              isActive("/approval")
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-3">
              <FiCheckCircle size={16} />
              Approval
            </span>

            {pendingApprovals > 0 && (
              <span
                className={`inline-flex min-w-5 h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                  isActive("/approval")
                    ? "bg-amber-100 text-amber-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {pendingApprovals}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/waste-weighing")
            }
            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
              isActive("/waste-weighing")
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FiBarChart2 size={16} />
            Waste Weighing
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/archive")
            }
            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
              isActive("/archive")
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FiArchive size={16} />
            Archive
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <FiLogOut size={15} />
            Log Out
          </button>
        </div>
      </aside>

      <main className="admin-page-content ml-64 min-h-screen min-w-0">
        <Outlet />
      </main>
    </div>
  );
}