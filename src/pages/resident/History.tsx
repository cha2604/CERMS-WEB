import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiFileText, FiXCircle } from "react-icons/fi";
import { supabase } from "../../lib/supabase";

interface ReportRecord {
  id: string;
  title: string;
  waste_type: string;
  location_name?: string | null;
  status: "Resolved" | "Rejected";
  created_at: string;
}

export default function History() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Resolved" | "Rejected">("All");

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setErrorMessage("");

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setErrorMessage("Please log in to view your report history.");
          return;
        }

        const { data, error } = await supabase
          .from("reports")
          .select("id, title, waste_type, location_name, status, created_at")
          .eq("user_id", user.id)
          .in("status", ["Resolved", "Rejected"])
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        setReports((data as ReportRecord[]) || []);
      } catch (error) {
        console.error("Failed to fetch report history:", error);
        setErrorMessage("Unable to load your report history.");
        setReports([]);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  const getReportTitle = (report: ReportRecord) => {
    return report.waste_type || report.title || "Waste Concern";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredReports = reports.filter((report) => {
    if (activeTab === "Resolved") return report.status === "Resolved";
    if (activeTab === "Rejected") return report.status === "Rejected";
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">
          Report History &amp; Archives
        </h1>

        <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500">
          Resolved Cleanups &amp; Rejected Reports Log
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("All")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === "All"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All History ({reports.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("Resolved")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === "Resolved"
              ? "bg-emerald-700 text-white shadow-xs"
              : "text-emerald-800 hover:bg-emerald-50"
          }`}
        >
          Resolved ({reports.filter((r) => r.status === "Resolved").length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("Rejected")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === "Rejected"
              ? "bg-rose-600 text-white shadow-xs"
              : "text-rose-700 hover:bg-rose-50"
          }`}
        >
          Rejected ({reports.filter((r) => r.status === "Rejected").length})
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <p className="text-sm font-semibold text-slate-400">
            Loading report history...
          </p>
        </div>
      ) : errorMessage ? (
        <div className="py-8 text-center">
          <p className="text-sm font-semibold text-rose-600">
            {errorMessage}
          </p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <FiFileText size={21} />
          </div>

          <p className="mt-3 text-sm font-extrabold text-slate-700">
            No reports in history
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-400">
            Resolved cleanups and rejected reports will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <Link
              key={report.id}
              to={`/report/${report.id}`}
              className="block rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900 truncate">
                    {getReportTitle(report)}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-600 truncate">
                    {report.location_name ||
                      "Barangay Tankulan, Manolo Fortich, Bukidnon"}{" "}
                    <span className="text-slate-400">•</span>{" "}
                    {formatDate(report.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {report.status === "Resolved" ? (
                    <span className="px-3 py-1.5 rounded-full text-[11px] font-extrabold border bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1.5">
                      <FiCheckCircle size={13} />
                      Resolved
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full text-[11px] font-extrabold border bg-rose-100 text-rose-800 border-rose-300 flex items-center gap-1.5">
                      <FiXCircle size={13} />
                      Rejected
                    </span>
                  )}

                  <FiArrowRight
                    size={17}
                    className="text-slate-400"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}