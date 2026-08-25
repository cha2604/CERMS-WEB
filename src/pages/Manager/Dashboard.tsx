import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface ReportItem {
  id: string;
  title?: string;
  waste_type?: string;
  location_name?: string;
  latitude?: number | null;
  longitude?: number | null;
  reporter_name?: string;
  severity?: string;
  status: "Pending" | "Ongoing" | "On-going" | "Resolved" | "Rejected";
  created_at: string;
}

interface MonthlyData {
  month: string;
  Pending: number;
  "On-going": number;
  Resolved: number;
  Rejected: number;
}

interface SeverityData {
  name: string;
  value: number;
  color: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Moderate: "#eab308",
  Low: "#10b981",
  "Very Low": "#3b82f6",
  Unclassified: "#94a3b8",
};

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyData[]>([]);
  const [severityChartData, setSeverityChartData] = useState<SeverityData[]>([]);

  useEffect(() => {
    async function fetchManagerReports() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const fetchedReports = (data as ReportItem[]) || [];
        setReports(fetchedReports);
        processAnalytics(fetchedReports);
      } catch (err) {
        console.error("Failed to fetch manager reports:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchManagerReports();
  }, []);

  const processAnalytics = (data: ReportItem[]) => {
    // 1. Process Monthly Overview Data
    const monthCounts: Record<string, { Pending: number; "On-going": number; Resolved: number; Rejected: number }> = {};
    MONTH_NAMES.forEach((m) => {
      monthCounts[m] = { Pending: 0, "On-going": 0, Resolved: 0, Rejected: 0 };
    });

    data.forEach((item) => {
      const date = new Date(item.created_at);
      const monthName = MONTH_NAMES[date.getMonth()];
      const statusKey = item.status === "Ongoing" ? "On-going" : item.status;

      if (monthCounts[monthName] && statusKey in monthCounts[monthName]) {
        monthCounts[monthName][statusKey as keyof (typeof monthCounts)[string]] += 1;
      }
    });

    const formattedMonthly = MONTH_NAMES.map((m) => ({
      month: m,
      ...monthCounts[m],
    }));

    setMonthlyChartData(formattedMonthly);

    // 2. Process Severity Breakdown Data
    const severityCounts: Record<string, number> = {
      Critical: 0,
      High: 0,
      Moderate: 0,
      Low: 0,
      "Very Low": 0,
    };

    data.forEach((item) => {
      const sev = item.severity || "Unclassified";
      if (severityCounts[sev] !== undefined) {
        severityCounts[sev] += 1;
      }
    });

    const formattedSeverity = Object.keys(severityCounts)
      .filter((key) => severityCounts[key] > 0)
      .map((key) => ({
        name: key,
        value: severityCounts[key],
        color: SEVERITY_COLORS[key] || "#94a3b8",
      }));

    setSeverityChartData(formattedSeverity);
  };

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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-emerald-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-emerald-800 flex items-center gap-2">
          <span className="text-xl font-black tracking-wider">CERMS</span>
          <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">Manager</span>
        </div>

        <nav className="p-4 space-y-1 text-xs font-bold flex-1">
          <button onClick={() => navigate("/manager/dashboard")} className="w-full flex items-center gap-3 px-3 py-2.5 bg-emerald-800 rounded-xl text-white">
            📊 Dashboard
          </button>
          <button onClick={() => navigate("/manager/reports")} className="w-full flex items-center gap-3 px-3 py-2.5 text-emerald-200 hover:bg-emerald-800/50 rounded-xl transition-all">
            📄 Reports List
          </button>
          <button onClick={() => navigate("/manager/map")} className="w-full flex items-center gap-3 px-3 py-2.5 text-emerald-200 hover:bg-emerald-800/50 rounded-xl transition-all">
            🗺 Geotag Map
          </button>
        </nav>

        <div className="p-4 border-t border-emerald-800">
          <button onClick={() => navigate("/login")} className="w-full py-2 px-3 bg-emerald-950 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all">
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Manager Dashboard</h1>
            <p className="text-xs text-slate-500 font-medium">Operational overview for Barangay Tankulan waste management.</p>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Role: <strong>Manager</strong></span>
          </div>
        </header>

        {/* Counter Cards */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-3xl font-black text-slate-900">{totalCount}</span>
            <p className="text-xs font-semibold text-slate-500 mt-1">Total Reports</p>
          </div>
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 shadow-sm">
            <span className="text-3xl font-black text-amber-600">{pendingCount}</span>
            <p className="text-xs font-semibold text-amber-800 mt-1">Pending</p>
          </div>
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200 shadow-sm">
            <span className="text-3xl font-black text-blue-600">{ongoingCount}</span>
            <p className="text-xs font-semibold text-blue-800 mt-1">On-going</p>
          </div>
          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 shadow-sm">
            <span className="text-3xl font-black text-emerald-600">{resolvedCount}</span>
            <p className="text-xs font-semibold text-emerald-800 mt-1">Resolved</p>
          </div>
          <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200 shadow-sm">
            <span className="text-3xl font-black text-rose-600">{rejectedCount}</span>
            <p className="text-xs font-semibold text-rose-800 mt-1">Rejected</p>
          </div>
        </div>

        {/* Visual Charts Section */}
        <div className="grid grid-cols-3 gap-6">
          {/* Reports Overview (Monthly) */}
          <div className="col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4">Reports Overview (Monthly)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Line type="monotone" dataKey="Pending" stroke="#eab308" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="On-going" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Resolved" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Rejected" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reports by Severity */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4">Reports by Severity</h3>
            <div className="h-64 w-full flex-1">
              {severityChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No severity data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={severityChartData} cx="50%" cy="45%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                      {severityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900">Recent Waste Concern Reports</h3>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading reports...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                    <th className="pb-3">Report ID</th>
                    <th className="pb-3">Concern Type</th>
                    <th className="pb-3">Location</th>
                    <th className="pb-3">Reporter</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((item) => (
                    <tr 
                      key={item.id} 
                      onClick={() => navigate(`/manager/reports/${item.id}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 font-mono font-bold text-emerald-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/manager/reports/${item.id}`);
                          }}
                          className="hover:underline cursor-pointer"
                        >
                          #{item.id.slice(0, 8)}
                        </button>
                      </td>
                      <td className="py-3 font-bold text-slate-900">{item.waste_type || item.title}</td>
                      <td className="py-3 font-mono text-slate-600">
                        {typeof item.latitude === "number" && typeof item.longitude === "number"
                          ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                          : item.location_name || "N/A"}
                      </td>
                      <td className="py-3 text-slate-700 font-medium">{item.reporter_name || "Resident"}</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${getStatusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/manager/reports/${item.id}`);
                          }}
                          className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 transition-all cursor-pointer"
                        >
                          Review & Action →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}