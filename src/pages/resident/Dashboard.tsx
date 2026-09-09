import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiPlus,
  FiXCircle,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

type ReportStatus =
  | "Pending"
  | "Ongoing"
  | "On-going"
  | "Resolved"
  | "Rejected"
  | "Draft";

interface ReportRecord {
  id: string;
  title: string;
  waste_type: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  location_name?: string | null;
  image_urls?: string[] | null;
  status: ReportStatus;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profileName } = useOutletContext<{ profileName: string }>();

  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/login");
          return;
        }

        const { data, error } = await supabase
          .from("reports")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        setReports((data as ReportRecord[]) || []);
      } catch (error) {
        console.error("Failed to fetch resident reports:", error);
        setReports([]);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, [navigate]);

  const totalReports = reports.length;

  const pendingCount = reports.filter(
    (report) => report.status === "Pending"
  ).length;

  const ongoingCount = reports.filter(
    (report) =>
      report.status === "Ongoing" ||
      report.status === "On-going"
  ).length;

  const resolvedCount = reports.filter(
    (report) => report.status === "Resolved"
  ).length;

  const rejectedCount = reports.filter(
    (report) => report.status === "Rejected"
  ).length;

  const recentReports = reports
    .filter(
      (report) =>
        report.status === "Pending" ||
        report.status === "Ongoing" ||
        report.status === "On-going"
    )
    .slice(0, 5);

  const getStatusBadgeClass = (status: ReportStatus) => {
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

      case "Draft":
        return "bg-slate-100 text-slate-700 border-slate-300";

      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

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
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          Hello, {profileName || "Resident"}!
        </h1>

        <p className="mt-1 text-sm font-semibold text-slate-500">
          Let&apos;s keep our barangay clean.
        </p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-slate-900">
            Report Overview
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <FiFileText size={20} />
              </div>

              <span className="text-3xl font-black text-slate-900">
                {totalReports}
              </span>
            </div>

            <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Total Reports
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <FiClock size={20} />
              </div>

              <span className="text-3xl font-black text-slate-900">
                {pendingCount}
              </span>
            </div>

            <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Pending
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <FiArrowRight size={20} />
              </div>

              <span className="text-3xl font-black text-slate-900">
                {ongoingCount}
              </span>
            </div>

            <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Ongoing
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <FiCheckCircle size={20} />
              </div>

              <span className="text-3xl font-black text-slate-900">
                {resolvedCount}
              </span>
            </div>

            <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Resolved
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-slate-900">
            Quick Actions
          </h2>
        </div>

        <Link
          to="/report"
          className="flex items-center justify-between w-full bg-emerald-800 text-white rounded-2xl px-5 py-4 shadow-sm hover:bg-emerald-900 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
              <FiPlus size={21} />
            </div>

            <div>
              <p className="font-extrabold text-sm">
                Submit Report
              </p>

              <p className="text-xs text-emerald-100 mt-0.5">
                Report a waste concern
              </p>
            </div>
          </div>

          <FiArrowRight size={20} />
        </Link>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900">
            Recent Reports
          </h2>

          <Link
            to="/my-reports"
            className="text-xs font-extrabold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
          >
            View All
            <FiArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-400">
            Loading reports...
          </div>
        ) : recentReports.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <FiFileText size={21} />
            </div>

            <p className="mt-3 text-sm font-extrabold text-slate-700">
              No recent reports
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              Your pending and ongoing reports will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentReports.map((report) => (
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
                    <span
                      className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold border ${getStatusBadgeClass(
                        report.status
                      )}`}
                    >
                      {report.status}
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
      </section>

      {rejectedCount > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <FiXCircle size={18} />
            </div>

            <div>
              <p className="text-sm font-extrabold text-rose-900">
                Rejected Reports
              </p>

              <p className="text-xs font-semibold text-rose-700 mt-0.5">
                You have {rejectedCount} rejected report
                {rejectedCount !== 1 ? "s" : ""}. Open My Reports to
                view the details.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}