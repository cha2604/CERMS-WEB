import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface ReportItem {
  id: string;
  title?: string;
  category?: string;
  waste_type?: string;
  location_name?: string;
  latitude?: number | null;
  longitude?: number | null;
  reporter_name?: string;
  status: "Pending" | "Ongoing" | "On-going" | "Resolved" | "Rejected";
  is_archived?: boolean;
  created_at: string;
}

type FilterTab =
  | "All Active"
  | "Pending"
  | "On-going"
  | "Resolved (Archived)"
  | "Rejected (Archived)";

export default function ManagerReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("All Active");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports((data as ReportItem[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUnarchive = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("reports")
        .update({ is_archived: false, status: "Pending" })
        .eq("id", reportId);

      if (error) throw error;

      setReports((prev) =>
        prev.map((item) =>
          item.id === reportId
            ? { ...item, is_archived: false, status: "Pending" }
            : item
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateReport = () => {
    const headers = ["Report ID,Concern Type,Location,Reporter,Date,Status,Archived\n"];
    const rows = filteredReports.map((r) => {
      const location = typeof r.latitude === "number" && typeof r.longitude === "number"
        ? `"${r.latitude}, ${r.longitude}"`
        : `"${r.location_name || "N/A"}"`;
      const date = new Date(r.created_at).toLocaleDateString();
      return `"${r.id}","${r.waste_type || r.title || "Waste Concern"}",${location},"${r.reporter_name || "Resident"}","${date}","${r.status}","${r.is_archived ? "Yes" : "No"}"`;
    });

    const blob = new Blob([headers.concat(rows.join("\n")).join("")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cerms_reports_${activeTab.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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

  const filteredReports = reports.filter((report) => {
    const isClosedStatus = report.status === "Resolved" || report.status === "Rejected";
    const isArchived = Boolean(report.is_archived) || isClosedStatus;

    if (activeTab === "All Active") {
      if (isArchived) return false;
    } else if (activeTab === "Pending") {
      if (isArchived || report.status !== "Pending") return false;
    } else if (activeTab === "On-going") {
      if (isArchived || (report.status !== "Ongoing" && report.status !== "On-going")) return false;
    } else if (activeTab === "Resolved (Archived)") {
      if (report.status !== "Resolved") return false;
    } else if (activeTab === "Rejected (Archived)") {
      if (report.status !== "Rejected") return false;
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const titleMatch = (report.title || report.category || report.waste_type || "").toLowerCase().includes(q);
      const idMatch = report.id.toLowerCase().includes(q);
      const reporterMatch = (report.reporter_name || "").toLowerCase().includes(q);

      return titleMatch || idMatch || reporterMatch;
    }

    return true;
  });

  const tabs: FilterTab[] = [
    "All Active",
    "Pending",
    "On-going",
    "Resolved (Archived)",
    "Rejected (Archived)",
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <aside className="w-64 bg-emerald-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-emerald-800 flex items-center gap-2">
          <span className="text-xl font-black tracking-wider">CERMS</span>
          <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">
            Manager
          </span>
        </div>

        <nav className="p-4 space-y-1 text-xs font-bold flex-1">
          <button
            onClick={() => navigate("/manager/dashboard")}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-emerald-200 hover:bg-emerald-800/50 rounded-xl transition-all"
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => navigate("/manager/reports")}
            className="w-full flex items-center gap-3 px-3 py-2.5 bg-emerald-800 rounded-xl text-white"
          >
            📄 Reports List
          </button>
          <button
            onClick={() => navigate("/manager/map")}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-emerald-200 hover:bg-emerald-800/50 rounded-xl transition-all"
          >
            🗺 Geotag Map
          </button>
        </nav>

        <div className="p-4 border-t border-emerald-800">
          <button
            onClick={() => navigate("/login")}
            className="w-full py-2 px-3 bg-emerald-950 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Reports Management</h1>
            <p className="text-xs text-slate-500 font-medium">
              Review active concerns and access resolved or rejected report archives.
            </p>
          </div>

          <button
            onClick={handleGenerateReport}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            📥 Generate Report
          </button>
        </header>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === tab
                      ? "bg-emerald-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="w-64">
              <input
                type="text"
                placeholder="Search reports or IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs font-semibold text-slate-400">
              Loading reports list...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-8 text-center text-xs font-medium text-slate-400">
              No reports found for "{activeTab}".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                    <th className="px-5 py-3.5">Report ID</th>
                    <th className="px-5 py-3.5">Concern Type</th>
                    <th className="px-5 py-3.5">Location</th>
                    <th className="px-5 py-3.5">Reporter</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {filteredReports.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/manager/reports/${item.id}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-emerald-800">
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

                      <td className="px-5 py-4 font-bold text-slate-900">
                        {item.waste_type || item.category || item.title || "Waste Concern Report"}
                      </td>

                      <td className="px-5 py-4 font-mono text-slate-600">
                        {typeof item.latitude === "number" && typeof item.longitude === "number"
                          ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                          : item.location_name || "N/A"}
                      </td>

                      <td className="px-5 py-4 text-slate-700 font-medium">
                        {item.reporter_name || "Resident"}
                      </td>

                      <td className="px-5 py-4 text-slate-500 font-medium">
                        {new Date(item.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border inline-block ${getStatusBadgeClass(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/manager/reports/${item.id}`);
                          }}
                          className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 transition-all cursor-pointer"
                        >
                          Review & Action →
                        </button>

                        {(activeTab === "Resolved (Archived)" ||
                          activeTab === "Rejected (Archived)") && (
                          <button
                            onClick={(e) => handleUnarchive(e, item.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition-all cursor-pointer"
                          >
                            Reopen
                          </button>
                        )}
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