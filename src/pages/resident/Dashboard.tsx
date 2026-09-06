import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface ReportItem {
  id: string;
  title: string;
  waste_type: string;
  location_name?: string;
  status: "Pending" | "Ongoing" | "On-going" | "Resolved" | "Rejected";
  created_at: string;
}

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("Resident");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();

          if (profile?.full_name) setUserName(profile.full_name);

          const { data: userReports } = await supabase
            .from("reports")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (userReports) setReports(userReports as ReportItem[]);
        }
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const totalCount = reports.length;
  const pendingCount = reports.filter((r) => r.status === "Pending").length;
  const ongoingCount = reports.filter((r) => r.status === "Ongoing" || r.status === "On-going").length;
  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;
  const rejectedCount = reports.filter((r) => r.status === "Rejected").length;

  const recentReports = reports.slice(0, 5);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Ongoing":
      case "On-going":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Resolved":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Rejected":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900">
          WELCOME {userName.toUpperCase()}!
        </h1>
        <p className="text-xs text-slate-500 font-semibold mt-0.5">
          Barangay Tankulan Waste Monitoring Dashboard
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-[11px] font-extrabold text-slate-400 uppercase">Total Reports</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">{totalCount}</h3>
        </div>

        <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 shadow-sm text-center">
          <p className="text-[11px] font-extrabold text-amber-800 uppercase">Pending</p>
          <h3 className="text-3xl font-black text-amber-900 mt-1">{pendingCount}</h3>
        </div>

        <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 shadow-sm text-center">
          <p className="text-[11px] font-extrabold text-emerald-800 uppercase">On-going</p>
          <h3 className="text-3xl font-black text-emerald-900 mt-1">{ongoingCount}</h3>
        </div>

        <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200 shadow-sm text-center">
          <p className="text-[11px] font-extrabold text-blue-800 uppercase">Resolved</p>
          <h3 className="text-3xl font-black text-blue-900 mt-1">{resolvedCount}</h3>
        </div>

        <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-200 shadow-sm text-center">
          <p className="text-[11px] font-extrabold text-rose-800 uppercase">Rejected</p>
          <h3 className="text-3xl font-black text-rose-900 mt-1">{rejectedCount}</h3>
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <button
          onClick={() => navigate("/report/new")}
          className="w-full max-w-md py-4 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-base rounded-2xl shadow-lg transition-all"
        >
          Submit Report
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900">Recent Reports</h2>

        {loading ? (
          <div className="py-8 text-center text-xs font-semibold text-slate-400">
            Loading recent reports...
          </div>
        ) : recentReports.length === 0 ? (
          <div className="py-8 text-center text-xs font-semibold text-slate-400">
            No reports submitted yet. Click "Submit Report" to report a waste concern!
          </div>
        ) : (
          <div className="space-y-3">
            {recentReports.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all gap-4"
              >
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">{r.waste_type || r.title}</h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {r.location_name || "Barangay Tankulan, Manolo Fortich"} • {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(r.status)}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}