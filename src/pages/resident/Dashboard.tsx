import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiBell,
  FiHome,
  FiFileText,
  FiMap,
  FiUser,
  FiPlusCircle,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";
import {
  getResidentStats,
  getResidentRecentReports,
} from "../../lib/DashboardQueries";
import type { ReportRow, StatusCounts } from "../../lib/DashboardQueries";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-blue-50 text-blue-700",
  Ongoing: "bg-amber-50 text-amber-700",
  Resolved: "bg-green-50 text-green-700",
  Rejected: "bg-red-50 text-red-700",
};

function timeAgo(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ResidentDashboard() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [stats, setStats] = useState<StatusCounts | null>(null);
  const [recent, setRecent] = useState<ReportRow[]>([]);
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
          .select("full_name")
          .eq("id", user.id)
          .single();

        const [statCounts, recentReports] = await Promise.all([
          getResidentStats(user.id),
          getResidentRecentReports(user.id, 5),
        ]);

        if (!isMounted) return;

        setFullName(profile?.full_name || "there");
        setStats(statCounts);
        setRecent(recentReports);
      } catch (err) {
        console.error("Failed to load resident dashboard:", err);
        if (isMounted) {
          setErrorMessage("Couldn't load your dashboard. Pull to refresh.");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 pb-24">
      {/* Header */}
      <div className="bg-white px-5 pb-5 pt-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-800">
              Hello, {loading ? "..." : fullName}! 👋
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Let's keep our barangay clean.
            </p>
          </div>
          <button
            aria-label="Notifications"
            className="rounded-full bg-green-50 p-3 text-green-700 transition hover:bg-green-100"
          >
            <FiBell size={20} />
          </button>
        </div>
      </div>

      <div className="px-5 pt-5">
        {errorMessage && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Overview */}
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Reports"
            value={stats?.total}
            loading={loading}
            className="bg-white text-slate-800"
          />
          <StatCard
            label="Pending"
            value={stats?.pending}
            loading={loading}
            className="bg-amber-50 text-amber-700"
          />
          <StatCard
            label="On-going"
            value={stats?.ongoing}
            loading={loading}
            className="bg-blue-50 text-blue-700"
          />
          <StatCard
            label="Resolved"
            value={stats?.resolved}
            loading={loading}
            className="bg-green-50 text-green-700"
          />
        </div>

        {/* Quick Actions */}
        <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/report/new"
            className="flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 font-semibold text-white transition hover:bg-green-800"
          >
            <FiPlusCircle size={18} />
            Submit Report
          </Link>
          <Link
            to="/reports"
            className="flex items-center justify-center gap-2 rounded-xl border border-green-700 px-4 py-3 font-semibold text-green-700 transition hover:bg-green-50"
          >
            <FiFileText size={18} />
            My Reports
          </Link>
        </div>

        {/* Recent Updates */}
        <div className="mb-3 mt-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Recent Updates
          </h2>
          <Link to="/reports" className="text-sm font-semibold text-green-700">
            View All
          </Link>
        </div>

        <div className="space-y-3">
          {loading &&
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-white/60"
              />
            ))}

          {!loading && recent.length === 0 && (
            <div className="rounded-xl bg-white p-6 text-center text-sm text-gray-500">
              No reports yet. Tap "Submit Report" to report your first
              concern.
            </div>
          )}

          {!loading &&
            recent.map((report) => (
              <Link
                key={report.id}
                to={`/reports/${report.id}`}
                className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">
                    {report.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {timeAgo(report.created_at)}
                  </p>
                </div>
                <span
                  className={`ml-3 shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    STATUS_STYLES[report.status] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {report.status}
                </span>
              </Link>
            ))}
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 flex items-center justify-around border-t border-gray-200 bg-white py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
        <NavItem icon={<FiHome size={20} />} label="Home" to="/dashboard" active />
        <NavItem icon={<FiFileText size={20} />} label="Reports" to="/reports" />
        <NavItem icon={<FiMap size={20} />} label="Map" to="/map" />
        <NavItem icon={<FiUser size={20} />} label="Profile" to="/profile" />
      </nav>
    </div>
  );
}

function StatCard({
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

function NavItem({
  icon,
  label,
  to,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  to: string;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 text-xs font-medium ${
        active ? "text-green-700" : "text-gray-400"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}