// pages/admin/Dashboard.tsx
//
// Matches wireframe screen 8 "Admin (Web Dashboard)".
// Assumes it lives at src/pages/admin/Dashboard.tsx so that
// `../../lib/...` resolves the same way Register.tsx does.
//
// Requires: npm install chart.js react-chartjs-2 react-icons

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import {
  FiGrid,
  FiFileText,
  FiMap,
  FiBarChart2,
  FiUsers,
  FiSettings,
  FiLogOut,
  FiChevronDown,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";
import {
  getAdminStats,
  getSeverityBreakdown,
  getWeeklyReportsOverview,
  getAdminRecentReports,
  type AdminReportRow,
  type StatusCounts,
  type SeverityCounts,
  type WeeklyPoint,
} from "../../lib/DashboardQueries";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

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

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [adminName, setAdminName] = useState("Admin");
  const [stats, setStats] = useState<StatusCounts | null>(null);
  const [severity, setSeverity] = useState<SeverityCounts | null>(null);
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [recent, setRecent] = useState<AdminReportRow[]>([]);
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

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();

        if (profile?.role !== "admin") {
          navigate("/dashboard");
          return;
        }

        const [statCounts, severityCounts, weeklyPoints, recentReports] =
          await Promise.all([
            getAdminStats(),
            getSeverityBreakdown(),
            getWeeklyReportsOverview(),
            getAdminRecentReports(10),
          ]);

        if (!isMounted) return;

        setAdminName(profile?.full_name || "Admin");
        setStats(statCounts);
        setSeverity(severityCounts);
        setWeekly(weeklyPoints);
        setRecent(recentReports);
      } catch (err) {
        console.error("Failed to load admin dashboard:", err);
        if (isMounted) {
          setErrorMessage("Couldn't load dashboard data. Try refreshing.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const lineData = useMemo(
    () => ({
      labels: weekly.map((w) => w.day),
      datasets: [
        {
          label: "Pending",
          data: weekly.map((w) => w.pending),
          borderColor: "#f59e0b",
          backgroundColor: "#f59e0b",
          tension: 0.35,
        },
        {
          label: "On-going",
          data: weekly.map((w) => w.ongoing),
          borderColor: "#3b82f6",
          backgroundColor: "#3b82f6",
          tension: 0.35,
        },
        {
          label: "Resolved",
          data: weekly.map((w) => w.resolved),
          borderColor: "#16a34a",
          backgroundColor: "#16a34a",
          tension: 0.35,
        },
        {
          label: "Rejected",
          data: weekly.map((w) => w.rejected),
          borderColor: "#dc2626",
          backgroundColor: "#dc2626",
          tension: 0.35,
        },
      ],
    }),
    [weekly]
  );

  const donutData = useMemo(
    () => ({
      labels: ["Critical", "High", "Moderate", "Low", "Very Low"],
      datasets: [
        {
          data: severity
            ? [
                severity.critical,
                severity.high,
                severity.moderate,
                severity.low,
                severity.veryLow,
              ]
            : [0, 0, 0, 0, 0],
          backgroundColor: [
            "#dc2626",
            "#f97316",
            "#eab308",
            "#16a34a",
            "#0ea5e9",
          ],
          borderWidth: 0,
        },
      ],
    }),
    [severity]
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col bg-green-900 text-white">
        <div className="flex items-center gap-2 px-6 py-6">
          <span className="text-xl">♻️</span>
          <span className="text-lg font-bold">CERMS</span>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.label === "Dashboard";
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

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <div className="h-8 w-8 rounded-full bg-green-100" />
            {adminName}
            <FiChevronDown size={16} className="text-gray-400" />
          </div>
        </div>

        <div className="px-8 py-6">
          {errorMessage && (
            <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-5 gap-4">
            <AdminStatCard
              label="Total Reports"
              value={stats?.total}
              loading={loading}
              className="bg-white text-slate-800"
            />
            <AdminStatCard
              label="Pending"
              value={stats?.pending}
              loading={loading}
              className="bg-blue-50 text-blue-700"
            />
            <AdminStatCard
              label="On-going"
              value={stats?.ongoing}
              loading={loading}
              className="bg-amber-50 text-amber-700"
            />
            <AdminStatCard
              label="Resolved"
              value={stats?.resolved}
              loading={loading}
              className="bg-green-50 text-green-700"
            />
            <AdminStatCard
              label="Rejected"
              value={stats?.rejected}
              loading={loading}
              className="bg-red-50 text-red-700"
            />
          </div>

          {/* Charts */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="col-span-2 rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">
                Reports Overview (This Week)
              </h2>
              <div className="h-64">
                <Line
                  data={lineData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 10 } } },
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">
                Reports by Severity
              </h2>
              <div className="h-64">
                <Doughnut
                  data={donutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } } },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Recent Reports table */}
          <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              Recent Reports
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 pr-4 font-medium">ID</th>
                    <th className="pb-3 pr-4 font-medium">Type of Concern</th>
                    <th className="pb-3 pr-4 font-medium">Location</th>
                    <th className="pb-3 pr-4 font-medium">Reporter</th>
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

                  {!loading && recent.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-400">
                        No reports yet.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    recent.map((report) => (
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
                          {report.latitude && report.longitude
                            ? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`
                            : "—"}
                        </td>
                        <td className="py-3 pr-4 text-slate-600">
                          {report.reporter_name}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              STATUS_STYLES[report.status] ??
                              "bg-gray-100 text-gray-700"
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
        </div>
      </main>
    </div>
  );
}

function AdminStatCard({
  label,
  value,
  loading,
  className,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  className: string;
}) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm ${className}`}>
      <p className="text-2xl font-bold">
        {loading ? (
          <span className="inline-block h-7 w-8 animate-pulse rounded bg-current/20" />
        ) : (
          value ?? 0
        )}
      </p>
      <p className="mt-1 text-xs font-medium opacity-80">{label}</p>
    </div>
  );
}