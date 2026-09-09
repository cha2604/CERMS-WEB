import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiFileText } from "react-icons/fi";
import { supabase } from "../../lib/supabase";

interface ReportRecord {
  id: string;
  title: string;
  waste_type: string;
  location_name?: string | null;
  status: "Pending" | "Ongoing" | "On-going" | "Resolved" | "Rejected";
  created_at: string;
}

export default function History() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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
          .select(
            "id, title, waste_type, location_name, status, created_at"
          )
          .eq("user_id", user.id)
          .eq("status", "Resolved")
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

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">
          Resolved Reports History
        </h1>

        <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500">
          Completed &amp; Resolved Barangay Tankulan Waste Concerns Log
        </p>
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
      ) : reports.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <FiFileText size={21} />
          </div>

          <p className="mt-3 text-sm font-extrabold text-slate-700">
            No resolved reports
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-400">
            Your completed reports will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
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
                  <span className="px-3 py-1.5 rounded-full text-[11px] font-extrabold border bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1.5">
                    <FiCheckCircle size={13} />
                    Resolved
                  </span>

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