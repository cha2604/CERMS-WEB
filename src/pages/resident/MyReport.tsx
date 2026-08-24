import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ResidentLayout from "./Layout";

interface ReportItem {
  id: string;
  title: string;
  waste_type?: string;
  status: "Pending" | "Ongoing" | "On-going" | "Resolved" | "Rejected";
  created_at: string;
  image_urls: string[];
}

export default function MyReport() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyReports() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data) setReports(data as ReportItem[]);
      } catch (err) {
        console.error("Failed to load reports from Supabase:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchMyReports();
  }, []);

  const filteredReports = reports.filter((report) => {
    if (filter === "All") return true;
    if (filter === "On-going" || filter === "Ongoing") {
      return report.status === "Ongoing" || report.status === "On-going";
    }
    return report.status === filter;
  });

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
    <ResidentLayout title="My Reports">
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {["All", "Pending", "On-going", "Resolved", "Rejected"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                filter === tab
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-400">
            Loading your reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-6">
            <p className="text-sm font-bold text-slate-700">No reports found</p>
            <p className="text-xs text-slate-400 mt-1">There are no reports under "{filter}".</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <div
            key={report.id}
            onClick={() => navigate(`/report/${report.id}`)}
            className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-14 w-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                    {report.image_urls && report.image_urls.length > 0 ? (
                      <img
                        src={report.image_urls[0]}
                        alt={report.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                        No Photo
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-900 text-sm truncate group-hover:text-emerald-700 transition-colors">
                      {report.waste_type || report.title || "Waste Concern Report"}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(report.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(
                      report.status
                    )}`}
                  >
                    {report.status}
                  </span>
                  <span className="text-slate-400 group-hover:text-emerald-600 font-bold text-sm">
                    →
                  </span>
                </div> 
              </div>
            ))}
          </div>
        )}
      </div>
    </ResidentLayout>
  );
}