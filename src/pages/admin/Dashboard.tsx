import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiMapPin,
  FiRefreshCw,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

interface ReportRecord {
  id: string;
  title: string | null;
  waste_type: string | null;
  location_name: string | null;
  status:
    | "Pending"
    | "Ongoing"
    | "On-going"
    | "Resolved"
    | "Rejected";
  created_at: string;
  profiles?: {
    full_name?: string | null;
  } | null;
}

interface ResidentAccount {
  id: string;
  full_name: string | null;
  email: string | null;
  contact_number: string | null;
  address: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [recentResidents, setRecentResidents] = useState<
    ResidentAccount[]
  >([]);
  const [totalReports, setTotalReports] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [ongoingReports, setOngoingReports] = useState(0);
  const [resolvedReports, setResolvedReports] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [totalWasteWeight, setTotalWasteWeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      const [
        reportsResponse,
        residentCountResponse,
        recentReportsResponse,
        recentResidentsResponse,
        wasteWeightResponse,
      ] = await Promise.all([
        supabase
          .from("reports")
          .select("id, status", {
            count: "exact",
            head: false,
          }),

        supabase
          .from("resident_approvals")
          .select("user_id", {
            count: "exact",
            head: true,
          })
          .eq("status", "pending"),

        supabase
          .from("reports")
          .select(
            "id, title, waste_type, location_name, status, created_at, profiles(full_name)"
          )
          .order("created_at", { ascending: false })
          .limit(6),

        supabase
          .from("profiles")
          .select(
            "id, full_name, email, contact_number, address, created_at"
          )
          .eq("role", "resident")
          .order("created_at", { ascending: false })
          .limit(6),

        supabase
          .from("waste_weights")
          .select("weight_kg"),
      ]);

      if (reportsResponse.error) {
        throw reportsResponse.error;
      }

      if (residentCountResponse.error) {
        throw residentCountResponse.error;
      }

      if (recentReportsResponse.error) {
        throw recentReportsResponse.error;
      }

      if (recentResidentsResponse.error) {
        throw recentResidentsResponse.error;
      }

      if (wasteWeightResponse.error) {
        throw wasteWeightResponse.error;
      }

      const reportRows =
        (reportsResponse.data || []) as ReportRecord[];

      const recentReportRows =
        (recentReportsResponse.data || []) as ReportRecord[];

      const residentRows =
        (recentResidentsResponse.data ||
          []) as ResidentAccount[];

      const wasteWeightRows =
        (wasteWeightResponse.data || []) as {
          weight_kg: number | null;
        }[];

      const totalWeight = wasteWeightRows.reduce(
        (sum, row) =>
          sum + Number(row.weight_kg || 0),
        0
      );

      setReports(recentReportRows);
      setRecentResidents(residentRows);
      setTotalReports(reportsResponse.count || 0);
      setPendingApprovals(
        residentCountResponse.count || 0
      );

      setPendingReports(
        reportRows.filter(
          (report) => report.status === "Pending"
        ).length
      );

      setOngoingReports(
        reportRows.filter(
          (report) =>
            report.status === "Ongoing" ||
            report.status === "On-going"
        ).length
      );

      setResolvedReports(
        reportRows.filter(
          (report) => report.status === "Resolved"
        ).length
      );

      setTotalWasteWeight(totalWeight);
    } catch (error) {
      console.error(
        "Failed to load admin dashboard:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load dashboard data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-amber-100 text-amber-800 border-amber-200";

      case "Ongoing":
      case "On-going":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";

      case "Resolved":
        return "bg-blue-100 text-blue-800 border-blue-200";

      case "Rejected":
        return "bg-rose-100 text-rose-800 border-rose-200";

      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatWeight = (value: number) =>
    `${Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} kg`;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 p-5 flex flex-col shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-lg shadow-md">
            C
          </div>

          <div>
            <h2 className="font-extrabold text-slate-900 text-base leading-none">
              CERMS
            </h2>

            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mt-1">
              WASTE MONITORING
            </p>
          </div>
        </div>

        <nav className="space-y-2 text-sm font-bold flex-1">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-full text-left px-4 py-3 rounded-xl bg-emerald-800 text-white shadow-sm"
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => navigate("/map")}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            Geotagged Map
          </button>

          <button
            type="button"
            onClick={() => navigate("/reports")}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            Reports
          </button>

          <button
            type="button"
            onClick={() => navigate("/users")}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            Accounts
          </button>

          <button
            type="button"
            onClick={() => navigate("/approval")}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-between"
          >
            <span>Approval</span>

            {pendingApprovals > 0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800">
                {pendingApprovals}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate("/waste-weighing")}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            Waste Weighing
          </button>

          <button
            type="button"
            onClick={() => navigate("/archive")}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            Archive
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-sm font-bold transition-all"
          >
            Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-6 overflow-y-auto">
        <div className="max-w-[1500px] mx-auto space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                Admin Dashboard
              </h1>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Barangay Tankulan waste management and monitoring overview.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCw
                size={16}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />
              Refresh
            </button>
          </header>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FiFileText size={20} />
              </div>

              <p className="mt-4 text-sm font-bold text-slate-500">
                Total Waste Reports
              </p>

              <p className="mt-1 text-3xl font-black text-slate-900">
                {loading ? "—" : totalReports}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <FiClock size={20} />
              </div>

              <p className="mt-4 text-sm font-bold text-slate-500">
                Pending Reports
              </p>

              <p className="mt-1 text-3xl font-black text-slate-900">
                {loading ? "—" : pendingReports}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FiRefreshCw size={20} />
              </div>

              <p className="mt-4 text-sm font-bold text-slate-500">
                Ongoing Reports
              </p>

              <p className="mt-1 text-3xl font-black text-slate-900">
                {loading ? "—" : ongoingReports}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <FiCheckCircle size={20} />
              </div>

              <p className="mt-4 text-sm font-bold text-slate-500">
                Resolved Reports
              </p>

              <p className="mt-1 text-3xl font-black text-slate-900">
                {loading ? "—" : resolvedReports}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <FiUsers size={20} />
              </div>

              <p className="mt-4 text-sm font-bold text-slate-500">
                Pending Approvals
              </p>

              <p className="mt-1 text-3xl font-black text-slate-900">
                {loading ? "—" : pendingApprovals}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                <FiBarChart2 size={20} />
              </div>

              <p className="mt-4 text-sm font-bold text-slate-500">
                Total Waste Weighed
              </p>

              <p className="mt-1 text-2xl font-black text-slate-900">
                {loading
                  ? "—"
                  : formatWeight(totalWasteWeight)}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-4 p-5 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Recent Waste Reports
                  </h2>

                  <p className="text-sm font-medium text-slate-500 mt-1">
                    Latest reports submitted by residents.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/reports")}
                  className="inline-flex items-center gap-2 text-sm font-black text-emerald-800 hover:text-emerald-900"
                >
                  View Reports
                  <FiArrowRight size={15} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                        Report
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                        Location
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                        >
                          Loading recent reports...
                        </td>
                      </tr>
                    ) : reports.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                        >
                          No reports available.
                        </td>
                      </tr>
                    ) : (
                      reports.map((report) => (
                        <tr
                          key={report.id}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <p className="font-black text-slate-900">
                              {report.waste_type ||
                                report.title ||
                                "Waste Report"}
                            </p>

                            <p className="text-xs font-medium text-slate-500 mt-1">
                              {report.profiles?.full_name ||
                                "Anonymous Resident"}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                            {report.location_name ||
                              "Barangay Tankulan"}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                                report.status
                              )}`}
                            >
                              {report.status}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap">
                            {formatDate(
                              report.created_at
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-11 w-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <FiMapPin size={19} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Quick Actions
                  </h2>

                  <p className="text-sm font-medium text-slate-500 mt-1">
                    Go directly to common admin tasks.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/approval")}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 px-4 py-4 text-left hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FiUserPlus
                      size={18}
                      className="text-emerald-700"
                    />

                    <div>
                      <p className="font-black text-slate-900">
                        Review Approvals
                      </p>

                      <p className="text-xs font-medium text-slate-500">
                        Manage resident verification.
                      </p>
                    </div>
                  </div>

                  <FiArrowRight
                    size={17}
                    className="text-slate-400"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/reports")}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 px-4 py-4 text-left hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FiFileText
                      size={18}
                      className="text-emerald-700"
                    />

                    <div>
                      <p className="font-black text-slate-900">
                        Review Reports
                      </p>

                      <p className="text-xs font-medium text-slate-500">
                        Monitor submitted waste concerns.
                      </p>
                    </div>
                  </div>

                  <FiArrowRight
                    size={17}
                    className="text-slate-400"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/map")}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 px-4 py-4 text-left hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FiMapPin
                      size={18}
                      className="text-emerald-700"
                    />

                    <div>
                      <p className="font-black text-slate-900">
                        Open Geotagged Map
                      </p>

                      <p className="text-xs font-medium text-slate-500">
                        View waste reports by location.
                      </p>
                    </div>
                  </div>

                  <FiArrowRight
                    size={17}
                    className="text-slate-400"
                  />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/waste-weighing")
                  }
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 px-4 py-4 text-left hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FiBarChart2
                      size={18}
                      className="text-emerald-700"
                    />

                    <div>
                      <p className="font-black text-slate-900">
                        Record Waste Weight
                      </p>

                      <p className="text-xs font-medium text-slate-500">
                        Record segregated waste and print MENRO reports.
                      </p>
                    </div>
                  </div>

                  <FiArrowRight
                    size={17}
                    className="text-slate-400"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/users")}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 px-4 py-4 text-left hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FiUsers
                      size={18}
                      className="text-emerald-700"
                    />

                    <div>
                      <p className="font-black text-slate-900">
                        Manage Accounts
                      </p>

                      <p className="text-xs font-medium text-slate-500">
                        View resident accounts.
                      </p>
                    </div>
                  </div>

                  <FiArrowRight
                    size={17}
                    className="text-slate-400"
                  />
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-4 p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Recent Resident Registrations
                </h2>

                <p className="text-sm font-medium text-slate-500 mt-1">
                  Latest resident accounts in CERMS.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/users")}
                className="inline-flex items-center gap-2 text-sm font-black text-emerald-800 hover:text-emerald-900"
              >
                Manage Accounts
                <FiArrowRight size={15} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Resident
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Email
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Area
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Registered
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        Loading resident registrations...
                      </td>
                    </tr>
                  ) : recentResidents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        No resident registrations found.
                      </td>
                    </tr>
                  ) : (
                    recentResidents.map((resident) => (
                      <tr
                        key={resident.id}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-black text-slate-900">
                            {resident.full_name ||
                              "Unnamed Resident"}
                          </div>

                          <div className="text-xs font-medium text-slate-500 mt-1">
                            {resident.contact_number ||
                              "No contact number"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {resident.email ||
                            "No email"}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {resident.address
                            ? resident.address
                                .split(",")[0]
                                .trim()
                            : "—"}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap">
                          {formatDate(
                            resident.created_at
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}