import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ResidentLayout from "./Layout";

interface ReportSummary {
  id: string;
  title: string;
  waste_type?: string;
  status: "Pending" | "Ongoing" | "On-going" | "Resolved" | "Rejected";
  created_at: string;
}

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [userName, setUserName] = useState("Charity");

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.user_metadata?.full_name) {
          const firstName = userData.user.user_metadata.full_name.split(" ")[0];
          setUserName(firstName);
        }

        const { data, error } = await supabase
          .from("reports")
          .select("id, title, waste_type, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;
        if (data) setReports(data as ReportSummary[]);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      }
    }

    loadDashboardData();
  }, []);

  const totalCount = reports.length;
  const pendingCount = reports.filter((r) => r.status === "Pending").length;
  const ongoingCount = reports.filter((r) => r.status === "Ongoing" || r.status === "On-going").length;
  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;
  const rejectedCount = reports.filter((r) => r.status === "Rejected").length;

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
      <div className="p-4 space-y-5 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-emerald-700 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
              {userName.charAt(0)}
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-1">
                Hello, {userName}! 👋
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Let's keep our barangay clean.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="relative p-2.5 text-slate-500 hover:text-slate-700 bg-slate-50 rounded-xl border border-slate-200"
          >
            🔔
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 rounded-full" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm col-span-2">
            <span className="text-3xl font-black text-slate-900">{totalCount}</span>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Total Reports</p>
          </div>

          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 shadow-sm">
            <span className="text-2xl font-black text-amber-600">{pendingCount}</span>
            <p className="text-xs font-semibold text-amber-800 mt-0.5">Pending</p>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-sm">
            <span className="text-2xl font-black text-blue-600">{ongoingCount}</span>
            <p className="text-xs font-semibold text-blue-800 mt-0.5">On-going</p>
          </div>

          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 shadow-sm">
            <span className="text-2xl font-black text-emerald-600">{resolvedCount}</span>
            <p className="text-xs font-semibold text-emerald-800 mt-0.5">Resolved</p>
          </div>

          <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 shadow-sm">
            <span className="text-2xl font-black text-rose-600">{rejectedCount}</span>
            <p className="text-xs font-semibold text-rose-800 mt-0.5">Rejected</p>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/report/new")}
              className="py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              ⊕ Submit Report
            </button>
            <button
              onClick={() => navigate("/reports")}
              className="py-3 px-4 bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-300 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              📄 My Reports
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Recent Updates
            </h3>
            <button
              onClick={() => navigate("/reports")}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="space-y-2">
            {reports.map((report) => (
              <div
             key={report.id}
             onClick={() => navigate(`/report/${report.id}`)}
             className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs group-hover:text-emerald-700 transition-colors">
                    {report.waste_type || report.title || "Waste Concern Report"}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(report.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(
                      report.status
                    )}`}
                  >
                    {report.status}
                  </span>
                  <span className="text-slate-400 group-hover:text-emerald-600 font-bold">
                    →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ResidentLayout>
  );
}