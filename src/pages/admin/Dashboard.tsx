import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiArrowRight,
  FiBarChart2,
  FiCamera,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiMapPin,
  FiRefreshCw,
  FiUsers,
} from "react-icons/fi";
import OrgChart from "../../components/admin/OrgChart";
import { supabase } from "../../lib/supabase";

interface ReportRecord {
  id: string;
  title: string | null;
  waste_type: string | null;
  location_name: string | null;
  status: string;
  created_at: string;
  profiles?: {
    full_name?: string | null;
  } | null;
  team_name: string | null;
  personnel_name: string | null;
}

interface ResidentAccount {
  id: string;
  full_name: string | null;
  email: string | null;
  contact_number: string | null;
  address: string | null;
  created_at: string;
}

interface PendingCompletion {
  id: string;
  report_id: string;
  action_taken: string | null;
  proof_image_url: string;
  submitted_at: string;
  verification_status: string;
  report_title: string;
  location_name: string | null;
  team_name: string | null;
  personnel_name: string | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [recentResidents, setRecentResidents] = useState<ResidentAccount[]>([]);
  const [pendingCompletions, setPendingCompletions] = useState<PendingCompletion[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [ongoingReports, setOngoingReports] = useState(0);
  const [resolvedReports, setResolvedReports] = useState(0);
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);
  const [totalWasteWeight, setTotalWasteWeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [showOrgChart, setShowOrgChart] = useState(false);

  useEffect(() => {
    if (location.state?.saveSuccess) {
      setSaveSuccess(location.state.saveSuccess);
      window.history.replaceState({}, document.title);

      const timeout = window.setTimeout(() => {
        setSaveSuccess("");
      }, 5000);

      return () => window.clearTimeout(timeout);
    }
  }, [location.state]);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-completion-reviews")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "report_completions",
        },
        () => {
          loadDashboard(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        recentReportsResponse,
        recentResidentsResponse,
        wasteWeightResponse,
        pendingCompletionsResponse,
      ] = await Promise.all([
        supabase
          .from("reports")
          .select("id, status", {
            count: "exact",
            head: false,
          }),

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

        supabase
          .from("report_completions")
          .select(
            "id, report_id, action_taken, proof_image_url, submitted_at, verification_status",
            { count: "exact" }
          )
          .eq("verification_status", "Pending Verification")
          .order("submitted_at", { ascending: false }),
      ]);

      if (reportsResponse.error) {
        throw reportsResponse.error;
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

      if (pendingCompletionsResponse.error) {
        throw pendingCompletionsResponse.error;
      }

      const reportRows = reportsResponse.data || [];
      const recentReportRows = recentReportsResponse.data || [];

      const recentReportIds = recentReportRows.map(
        (report) => report.id
      );

      let assignmentsData: {
        report_id: string;
        team_name: string | null;
        personnel_name: string | null;
      }[] = [];

      if (recentReportIds.length > 0) {
        const {
          data,
          error: assignmentsError,
        } = await supabase
          .from("report_assignments")
          .select("report_id, team_name, personnel_name")
          .in("report_id", recentReportIds);

        if (assignmentsError) {
          throw assignmentsError;
        }

        assignmentsData = data || [];
      }

      const assignmentMap = new Map(
        assignmentsData.map((assignment) => [
          assignment.report_id,
          assignment,
        ])
      );

      const mappedReports = recentReportRows.map((report) => {
        const assignment = assignmentMap.get(report.id);

        return {
          ...report,
          team_name: assignment?.team_name || null,
          personnel_name: assignment?.personnel_name || null,
        };
      }) as ReportRecord[];

      const pendingCompletionRows =
        pendingCompletionsResponse.data || [];

      const pendingReportIds = [
        ...new Set(
          pendingCompletionRows.map(
            (completion) => completion.report_id
          )
        ),
      ];

      let pendingReportData: {
        id: string;
        title: string | null;
        waste_type: string | null;
        location_name: string | null;
      }[] = [];

      let pendingAssignmentData: {
        report_id: string;
        team_name: string | null;
        personnel_name: string | null;
      }[] = [];

      if (pendingReportIds.length > 0) {
        const [
          pendingReportsResponse,
          pendingAssignmentsResponse,
        ] = await Promise.all([
          supabase
            .from("reports")
            .select("id, title, waste_type, location_name")
            .in("id", pendingReportIds),

          supabase
            .from("report_assignments")
            .select("report_id, team_name, personnel_name")
            .in("report_id", pendingReportIds),
        ]);

        if (pendingReportsResponse.error) {
          throw pendingReportsResponse.error;
        }

        if (pendingAssignmentsResponse.error) {
          throw pendingAssignmentsResponse.error;
        }

        pendingReportData = pendingReportsResponse.data || [];
        pendingAssignmentData = pendingAssignmentsResponse.data || [];
      }

      const pendingReportMap = new Map(
        pendingReportData.map((report) => [
          report.id,
          report,
        ])
      );

      const pendingAssignmentMap = new Map(
        pendingAssignmentData.map((assignment) => [
          assignment.report_id,
          assignment,
        ])
      );

      const mappedPendingCompletions: PendingCompletion[] =
        pendingCompletionRows.map((completion) => {
          const report = pendingReportMap.get(completion.report_id);
          const assignment = pendingAssignmentMap.get(completion.report_id);

          return {
            id: completion.id,
            report_id: completion.report_id,
            action_taken: completion.action_taken,
            proof_image_url: completion.proof_image_url,
            submitted_at: completion.submitted_at,
            verification_status: completion.verification_status,
            report_title:
              report?.waste_type ||
              report?.title ||
              "Waste Report",
            location_name: report?.location_name || null,
            team_name: assignment?.team_name || null,
            personnel_name: assignment?.personnel_name || null,
          };
        });

      const residentRows =
        (recentResidentsResponse.data || []) as ResidentAccount[];

      const wasteWeightRows =
        (wasteWeightResponse.data || []) as {
          weight_kg: number | null;
        }[];

      const totalWeight = wasteWeightRows.reduce(
        (sum, row) => sum + Number(row.weight_kg || 0),
        0
      );

      setReports(mappedReports);
      setRecentResidents(residentRows);
      setPendingCompletions(mappedPendingCompletions);

      setTotalReports(reportsResponse.count || 0);

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

      setPendingVerificationCount(
        pendingCompletionsResponse.count ??
          pendingCompletionRows.length
      );

      setTotalWasteWeight(totalWeight);
    } catch (error) {
      console.error("Failed to load admin dashboard:", error);

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

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
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
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </header>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
              <FiCheckCircle size={18} />
              {saveSuccess}
            </div>
          )}

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
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

            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                <FiBarChart2 size={20} />
              </div>

              <p className="mt-4 text-sm font-bold text-slate-500">
                Total Waste Weighed
              </p>

              <p className="mt-1 text-2xl font-black text-slate-900">
                {loading ? "—" : formatWeight(totalWasteWeight)}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-violet-200 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <FiCamera size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Pending Staff Completion Reviews
                  </h2>

                  <p className="text-sm font-medium text-slate-500 mt-1">
                    Staff completion photos awaiting administrator verification.
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-black text-violet-800">
                {loading
                  ? "Loading..."
                  : `${pendingVerificationCount} Pending`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Report
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Location
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Assigned Staff
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Action Taken
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Completion Photo
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Date Submitted
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                      >
                        Loading Staff completion reviews...
                      </td>
                    </tr>
                  ) : pendingCompletions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center"
                      >
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <FiCheckCircle size={24} />
                        </div>

                        <p className="mt-3 font-black text-slate-700">
                          No Pending Verification
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-500">
                          New Staff completion submissions will appear here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pendingCompletions.map((completion) => (
                      <tr
                        key={completion.id}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-900">
                            {completion.report_title}
                          </p>

                          <span className="mt-1 inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black text-violet-800">
                            Pending Verification
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <FiMapPin
                              size={14}
                              className="shrink-0 text-slate-400"
                            />
                            {completion.location_name ||
                              "Barangay Tankulan"}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-slate-800">
                            {completion.personnel_name ||
                              "Assigned Staff"}
                          </p>

                          {completion.team_name && (
                            <p className="mt-1 text-xs font-medium text-slate-500">
                              {completion.team_name}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-xs text-sm font-medium leading-6 text-slate-700">
                            {completion.action_taken ||
                              "No action description provided."}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {completion.proof_image_url ? (
                            <img
                              src={completion.proof_image_url}
                              alt="Staff completion proof"
                              className="h-20 w-24 rounded-xl border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-20 w-24 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                              <FiCamera size={22} />
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                          {formatDateTime(completion.submitted_at)}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/completion-review/${completion.id}`
                              )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-xs font-black text-white transition hover:bg-violet-800"
                          >
                            View and Review
                            <FiArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
                        Person in Charge
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
                          colSpan={5}
                          className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                        >
                          Loading recent reports...
                        </td>
                      </tr>
                    ) : reports.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                        >
                          No reports available.
                        </td>
                      </tr>
                    ) : (
                      reports.map((report) => (
                        <tr
                          key={report.id}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 cursor-pointer"
                          onClick={() =>
                            navigate(`/report/${report.id}`)
                          }
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

                          <td className="px-5 py-4 text-sm">
                            {report.team_name || report.personnel_name ? (
                              <>
                                <div className="font-semibold text-slate-700">
                                  {report.personnel_name ||
                                    "Unassigned personnel"}
                                </div>

                                {report.team_name && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {report.team_name}
                                  </p>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                Not assigned
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap">
                            {formatDate(report.created_at)}
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
                  onClick={() => navigate("/waste-weighing")}
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
                          {resident.email || "No email"}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {resident.address
                            ? resident.address.split(",")[0].trim()
                            : "—"}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap">
                          {formatDate(resident.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setShowOrgChart((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
          >
            {showOrgChart ? "Hide" : "View"} Barangay Organizational Chart
            <FiUsers size={16} />
          </button>
        </div>

        {showOrgChart && <OrgChart />}
      </main>
    </div>
  );
}