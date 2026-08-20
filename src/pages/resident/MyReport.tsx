import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  getResidentReports,
  type ReportRow,
  type ReportStatus,
} from "../../lib/DashboardQueries";
import ResidentLayout from "../../pages/resident/Layout";

const TABS: { label: string; value: ReportStatus | "All" }[] = [
  { label: "All", value: "All" },
  { label: "Pending", value: "Pending" },
  { label: "On-going", value: "Ongoing" },
  { label: "Resolved", value: "Resolved" },
  { label: "Rejected", value: "Rejected" },
];

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-blue-50 text-blue-700",
  Ongoing: "bg-amber-50 text-amber-700",
  Resolved: "bg-green-50 text-green-700",
  Rejected: "bg-red-50 text-red-700",
};

export default function MyReport() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ReportStatus | "All">("All");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/login");
          return;
        }

        const data = await getResidentReports(user.id, activeTab);

        if (isMounted) {
          setReports(data);
        }
      } catch (err) {
        console.error("Failed to load reports:", err);
        if (isMounted) {
          setErrorMessage("Couldn't load your reports. Pull to refresh.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [activeTab, navigate]);

  return (
    <ResidentLayout title="My Reports">
      <div className="px-5 py-5">
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.value
                  ? "bg-green-700 text-white"
                  : "bg-green-50 text-green-700 hover:bg-green-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          {loading &&
            [1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-white/60" />
            ))}

          {!loading && reports.length === 0 && (
            <div className="rounded-xl bg-white p-6 text-center text-sm text-gray-500">
              No {activeTab !== "All" ? activeTab.toLowerCase() : ""} reports
              found.
            </div>
          )}

          {!loading &&
            reports.map((report) => (
              <div
                key={report.id}
                className="flex gap-3 rounded-xl bg-white p-3 shadow-sm"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {report.image_urls && report.image_urls.length > 0 ? (
                    <img
                      src={report.image_urls[0]}
                      alt={report.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      No photo
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">
                    {report.title}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(report.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      STATUS_STYLES[report.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </ResidentLayout>
  );
}