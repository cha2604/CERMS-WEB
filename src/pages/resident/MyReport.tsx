import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ResidentLayout from "./Layout";

interface Report {
  id: string;
  category?: string;
  title?: string;
  created_at: string;
  status: string;
  image_url?: string;
  image_urls?: string[];
  is_archived?: boolean;
}

type FilterTab = "All" | "Pending" | "On-going" | "Resolved" | "Rejected" | "Archived";

export default function MyReport() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("All");

  const fetchReports = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleArchive = async (e: React.MouseEvent, reportId: string, archiveStatus: boolean) => {
    e.stopPropagation(); // Prevents navigating to details page
    try {
      const { error } = await supabase
        .from("reports")
        .update({ is_archived: archiveStatus })
        .eq("id", reportId);

      if (error) throw error;

      // Optimistic update
      setReports((prev) =>
        prev.map((item) =>
          item.id === reportId ? { ...item, is_archived: archiveStatus } : item
        )
      );
    } catch (err) {
      console.error("Error archiving report:", err);
    }
  };

  const filteredReports = reports.filter((report) => {
    const isArchived = Boolean(report.is_archived);

    if (activeTab === "Archived") {
      return isArchived;
    }

    // Exclude archived reports from "All" and all other standard tabs
    if (isArchived) return false;

    if (activeTab === "All") return true;
    if (activeTab === "On-going") return report.status === "Ongoing" || report.status === "On-going";
    return report.status === activeTab;
  });

  const tabs: FilterTab[] = ["All", "Pending", "On-going", "Resolved", "Rejected", "Archived"];

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
        {/* Filter Tabs */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === tab
                  ? "bg-emerald-900 text-white shadow-sm"
                  : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs font-semibold text-slate-400">
            Loading your reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs font-medium text-slate-400">
            No reports found in "{activeTab}".
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const isEligibleForArchive =
                report.status === "Resolved" || report.status === "Rejected";

              return (
                <div
                  key={report.id}
                  onClick={() => navigate(`/report/${report.id}`)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-14 w-14 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
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
                      <p className="text-sm font-extrabold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                        {report.category || report.title || "Waste Concern Report"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(report.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
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

                    {/* Archive / Unarchive Action Buttons */}
                    {report.is_archived ? (
                      <button
                        onClick={(e) => handleArchive(e, report.id, false)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition-all"
                        title="Unarchive"
                      >
                        Unarchive
                      </button>
                    ) : (
                      isEligibleForArchive && (
                        <button
                          onClick={(e) => handleArchive(e, report.id, true)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all"
                          title="Archive"
                        >
                          Archive
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ResidentLayout>
  );
}