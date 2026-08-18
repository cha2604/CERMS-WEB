import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiGrid, FiFileText, FiMap, FiBarChart2, FiUsers, FiSettings, FiLogOut } from "react-icons/fi";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { getAllAdminReports, type AdminReportDetail } from "../../lib/AdminReport";
import type { ReportStatus } from "../../lib/DashboardQueries";

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

const NAV_ITEMS = [
  { label: "Dashboard", icon: FiGrid, to: "/admin/dashboard" },
  { label: "Reports", icon: FiFileText, to: "/admin/reports" },
  { label: "Map", icon: FiMap, to: "/admin/map" },
  { label: "Analytics", icon: FiBarChart2, to: "/admin/analytics" },
  { label: "Users", icon: FiUsers, to: "/admin/users" },
  { label: "Settings", icon: FiSettings, to: "/admin/settings" },
];

export default function AdminReports() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ReportStatus | "All">("All");
  const [reports, setReports] = useState<AdminReportDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const data = await getAllAdminReports(activeTab);
        if (isMounted) setReports(data);
      } catch (err) {
        console.error("Failed to load admin reports:", err);
        if (isMounted) setErrorMessage("Couldn't load reports.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="flex w-60 shrink-0 flex-col bg-green-900 text-white">
        <div className="flex items-center gap-2 px-6 py-6">
          <span className="text-xl">♻️</span>
          <span className="text-lg font-bold">CERMS</span>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.label === "Reports";
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-green-700 text-white"
                    : "text-green-100 hover:bg-green-800"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mx-3 mb-6 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-green-100 transition hover:bg-green-800"
        >
          <FiLogOut size={18} />
          Logout
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-gray-200 bg-white px-8 py-4">
          <h1 className="text-xl font-bold text-slate-800">Reports</h1>
        </div>

        <div className="px-8 py-6">
          <div className="mb-5 flex gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.value
                    ? "bg-green-700 text-white"
                    : "bg-white text-green-700 hover:bg-green-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-3 pr-4 font-medium">ID</th>
                  <th className="pb-3 pr-4 font-medium">Type of Concern</th>
                  <th className="pb-3 pr-4 font-medium">Reporter</th>
                  <th className="pb-3 pr-4 font-medium">Severity</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date Reported</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  [1, 2, 3, 4].map((i) => (
                    <tr key={i}>
                      <td colSpan={6} className="py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-100" />
                      </td>
                    </tr>
                  ))}

                {!loading && reports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      No reports found.
                    </td>
                  </tr>
                )}

                {!loading &&
                  reports.map((report) => (
                    <tr
                      key={report.id}
                      onClick={() => navigate(`/admin/reports/${report.id}`)}
                      className="cursor-pointer border-b border-gray-50 transition hover:bg-gray-50"
                    >
                      <td className="py-3 pr-4 font-medium text-slate-700">
                        #{report.id.slice(0, 8)}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {report.category}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {report.reporter_name}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {report.severity ?? "Unclassified"}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            STATUS_STYLES[report.status] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500">
                        {new Date(report.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}