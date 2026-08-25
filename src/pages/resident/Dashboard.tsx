import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ResidentLayout from "./Layout";
import {
  getResidentStats,
  getResidentRecentReports,
  type ReportRow,
  type StatusCounts,
} from "../../lib/DashboardQueries";

export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("User");
  const [stats, setStats] = useState<StatusCounts>({
    total: 0,
    pending: 0,
    ongoing: 0,
    resolved: 0,
    rejected: 0,
  });
  const [recentReports, setRecentReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        // 1. Get authenticated user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        // 2. Fetch Profile Name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        const name =
          profile?.full_name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "User";
        setUserName(name);

        // 3. Fetch stats and recent 5 reports in parallel
        const [userStats, recentData] = await Promise.all([
          getResidentStats(user.id),
          getResidentRecentReports(user.id, 5),
        ]);

        setStats(userStats);
        setRecentReports(recentData);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Ongoing":
      case "On-going":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Resolved":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Rejected":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  return (
    <ResidentLayout title="Dashboard">
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {/* Header Greeting */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-base shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-1">
                Hello, {userName}! 👋
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Let's keep our barangay clean.
              </p>
            </div>
          </div>
          <button
            className="p-2 rounded-full bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-all text-xs"
            title="Notifications"
          >
            🔔
          </button>
        </div>

        {/* Total Reports */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <span className="text-3xl font-black text-slate-900">{stats.total}</span>
          <p className="text-xs font-bold text-slate-400 mt-0.5">Total Reports</p>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/60">
            <span className="text-2xl font-black text-amber-800">{stats.pending}</span>
            <p className="text-xs font-bold text-amber-700 mt-0.5">Pending</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200/60">
            <span className="text-2xl font-black text-blue-800">{stats.ongoing}</span>
            <p className="text-xs font-bold text-blue-700 mt-0.5">On-going</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200/60">
            <span className="text-2xl font-black text-emerald-800">{stats.resolved}</span>
            <p className="text-xs font-bold text-emerald-700 mt-0.5">Resolved</p>
          </div>
          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200/60">
            <span className="text-2xl font-black text-rose-800">{stats.rejected}</span>
            <p className="text-xs font-bold text-rose-700 mt-0.5">Rejected</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase">
            Quick Actions
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/report/new")}
              className="py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>⊕</span> Submit Report
            </button>
            <button
              onClick={() => navigate("/reports")}
              className="py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-emerald-900 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>📋</span> My Reports
            </button>
          </div>
        </div>

        {/* Recent Updates */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase">
              Recent Updates
            </p>
            <button
              onClick={() => navigate("/reports")}
              className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs font-semibold text-slate-400">
              Loading recent updates...
            </div>
          ) : recentReports.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs font-medium text-slate-400">
              No reports submitted yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => navigate(`/report/${report.id}`)}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                      {report.image_url || report.image_urls?.[0] ? (
                        <img
                          src={report.image_url || report.image_urls?.[0]}
                          alt="Report thumbnail"
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[9px] text-slate-400">
                          No Photo
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                        {report.category || report.title || "Waste Concern Report"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(report.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border shrink-0 ${getStatusBadgeClass(
                      report.status
                    )}`}
                  >
                    {report.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ResidentLayout>
  );
}