import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "leaflet/dist/leaflet.css";

type ReportTimeframe =
  | "today"
  | "monthly"
  | "yearly"
  | "custom"
  | "resolved";

type CustomReportType = "all" | "resolved";

interface ReportRecord {
  id: string;
  title: string;
  waste_type: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  location_name?: string;
  image_urls?: string[];
  status:
    | "Pending"
    | "Ongoing"
    | "On-going"
    | "Resolved"
    | "Rejected";
  severity?: string;
  created_at: string;
  reporter_name?: string;
  profiles?: {
    full_name?: string;
  } | null;
}

export default function AdminReports() {
  const navigate = useNavigate();

  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [reportTimeframe, setReportTimeframe] =
    useState<ReportTimeframe>("monthly");

  const currentMonthStr = new Date().toLocaleString("en-US", {
    month: "short",
  });

  const currentYearStr = new Date().getFullYear().toString();

  const today = new Date();

  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const [selectedMonth, setSelectedMonth] =
    useState<string>(currentMonthStr);

  const [selectedYear, setSelectedYear] =
    useState<string>(currentYearStr);

  const [fromDate, setFromDate] =
    useState<string>(todayString);

  const [toDate, setToDate] =
    useState<string>(todayString);

  const [customReportType, setCustomReportType] =
    useState<CustomReportType>("all");

  const [pendingApprovalCount, setPendingApprovalCount] =
    useState(0);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);

        const [reportsRes, approvalsRes] =
          await Promise.all([
            supabase
              .from("reports")
              .select("*, profiles(full_name)")
              .order("created_at", {
                ascending: false,
              }),

            supabase
              .from("resident_approvals")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq("status", "pending"),
          ]);

        if (!reportsRes.error && reportsRes.data) {
          setReports(
            reportsRes.data as ReportRecord[]
          );
        }

        if (!approvalsRes.error) {
          setPendingApprovalCount(
            approvalsRes.count || 0
          );
        }
      } catch (error) {
        console.error(
          "Failed to load reports:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

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

  const monthMap: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const query =
        searchQuery.trim().toLowerCase();

      const reporter = (
        report.reporter_name ||
        report.profiles?.full_name ||
        ""
      ).toLowerCase();

      const location = (
        report.location_name || ""
      ).toLowerCase();

      const titleOrType = (
        report.waste_type ||
        report.title ||
        ""
      ).toLowerCase();

      const id = (
        report.id || ""
      ).toLowerCase();

      const matchesQuery =
        !query ||
        id.includes(query) ||
        titleOrType.includes(query) ||
        reporter.includes(query) ||
        location.includes(query);

      if (!matchesQuery) {
        return false;
      }

      const reportDate =
        new Date(report.created_at);

      if (reportTimeframe === "today") {
        const currentDate = new Date();

        return (
          reportDate.getDate() ===
            currentDate.getDate() &&
          reportDate.getMonth() ===
            currentDate.getMonth() &&
          reportDate.getFullYear() ===
            currentDate.getFullYear()
        );
      }

      if (reportTimeframe === "monthly") {
        const targetMonth =
          monthMap[selectedMonth];

        return (
          targetMonth !== undefined &&
          reportDate.getMonth() === targetMonth &&
          reportDate.getFullYear() ===
            Number(selectedYear)
        );
      }

      if (reportTimeframe === "yearly") {
        return (
          reportDate.getFullYear() ===
          Number(selectedYear)
        );
      }

      if (reportTimeframe === "custom") {
        const start = new Date(
          `${fromDate}T00:00:00`
        );

        const end = new Date(
          `${toDate}T23:59:59`
        );

        const withinRange =
          reportDate >= start &&
          reportDate <= end;

        if (!withinRange) {
          return false;
        }

        if (
          customReportType ===
          "resolved"
        ) {
          return (
            report.status === "Resolved"
          );
        }

        return true;
      }

      if (reportTimeframe === "resolved") {
        return report.status === "Resolved";
      }

      return true;
    });
  }, [
    reports,
    searchQuery,
    reportTimeframe,
    selectedMonth,
    selectedYear,
    fromDate,
    toDate,
    customReportType,
  ]);

  const getStatusBadgeClass = (
    status: string
  ) => {
    switch (status) {
      case "Pending":
        return "bg-amber-100 text-amber-800 border-amber-300";

      case "Ongoing":
      case "On-going":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";

      case "Resolved":
        return "bg-blue-100 text-blue-800 border-blue-300";

      case "Rejected":
        return "bg-rose-100 text-rose-800 border-rose-300";

      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  const getEmptyMessage = () => {
    if (searchQuery) {
      return "No reports matching your search query.";
    }

    if (reportTimeframe === "today") {
      return "No reports submitted today.";
    }

    if (reportTimeframe === "monthly") {
      return `No reports for ${selectedMonth} ${selectedYear} yet.`;
    }

    if (reportTimeframe === "yearly") {
      return `No reports recorded for ${selectedYear} yet.`;
    }

    if (reportTimeframe === "custom") {
      return customReportType === "resolved"
        ? "No resolved reports found for the selected date range."
        : "No reports found for the selected date range.";
    }

    if (reportTimeframe === "resolved") {
      return "No resolved reports found.";
    }

    return "No reports available.";
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();

    navigate("/login", {
      replace: true,
    });
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 p-5 flex flex-col shrink-0 print:hidden">
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
            onClick={() =>
              navigate("/dashboard")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/map")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            Geotagged Map
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/reports")
            }
            className="w-full text-left px-4 py-3 rounded-xl bg-emerald-800 text-white shadow-sm transition-all"
          >
            Reports
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/users")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            People
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/approval")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-between"
          >
            <span>Approval</span>

            {pendingApprovalCount >
              0 && (
              <span className="min-w-6 h-6 px-1.5 rounded-full bg-amber-500 text-white text-[11px] flex items-center justify-center font-black">
                {pendingApprovalCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/archive")
            }
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

      <main className="flex-1 p-6 space-y-6 overflow-y-auto print:p-0 print:bg-white">
        <div className="hidden print:block mb-6 border-b border-slate-300 pb-4 text-center">
          <h1 className="text-2xl font-black text-emerald-900">
            BARANGAY TANKULAN WASTE MANAGEMENT OFFICE
          </h1>

          <p className="text-sm text-slate-700 font-bold">
            Official Waste Report
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Generated Date:{" "}
            {new Date().toLocaleDateString(
              "en-US",
              {
                month: "long",
                day: "numeric",
                year: "numeric",
              }
            )}
          </p>
        </div>

        <div className="space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                Reports
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Barangay Tankulan Waste Management & Monitoring
              </p>
            </div>
          </header>

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900">
                Resident Report Overview
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Summary of submitted waste concern reports
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="bg-slate-100/70 p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase">
                  Total Reports
                </p>

                <h3 className="text-3xl font-black text-slate-900 mt-1">
                  {totalReports}
                </h3>
              </div>

              <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 shadow-sm">
                <p className="text-xs font-bold text-amber-800 uppercase">
                  Pending
                </p>

                <h3 className="text-3xl font-black text-amber-900 mt-1">
                  {pendingCount}
                </h3>
              </div>

              <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 shadow-sm">
                <p className="text-xs font-bold text-emerald-800 uppercase">
                  Ongoing
                </p>

                <h3 className="text-3xl font-black text-emerald-900 mt-1">
                  {ongoingCount}
                </h3>
              </div>

              <div className="bg-blue-50/70 p-5 rounded-2xl border border-blue-200 shadow-sm">
                <p className="text-xs font-bold text-blue-800 uppercase">
                  Resolved
                </p>

                <h3 className="text-3xl font-black text-blue-900 mt-1">
                  {resolvedCount}
                </h3>
              </div>

              <div className="bg-rose-50/70 p-5 rounded-2xl border border-rose-200 shadow-sm">
                <p className="text-xs font-bold text-rose-800 uppercase">
                  Rejected
                </p>

                <h3 className="text-3xl font-black text-rose-900 mt-1">
                  {rejectedCount}
                </h3>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Official Waste Reports
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Barangay Tankulan Waste Management & Monitoring Summaries
                  </p>
                </div>

                <div className="w-full xl:w-auto">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) =>
                      setSearchQuery(
                        event.target.value
                      )
                    }
                    placeholder="Search reports..."
                    className="w-full xl:w-72 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setReportTimeframe("today")
                  }
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${
                    reportTimeframe ===
                    "today"
                      ? "bg-emerald-800 text-white border-emerald-800"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setReportTimeframe("monthly")
                  }
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${
                    reportTimeframe ===
                    "monthly"
                      ? "bg-emerald-800 text-white border-emerald-800"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Monthly Report
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setReportTimeframe("yearly")
                  }
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${
                    reportTimeframe ===
                    "yearly"
                      ? "bg-emerald-800 text-white border-emerald-800"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Yearly Report
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setReportTimeframe("custom")
                  }
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${
                    reportTimeframe ===
                    "custom"
                      ? "bg-emerald-800 text-white border-emerald-800"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Custom Date
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setReportTimeframe(
                      "resolved"
                    )
                  }
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${
                    reportTimeframe ===
                    "resolved"
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  Resolved Reports ({resolvedCount})
                </button>
              </div>

              {reportTimeframe ===
                "monthly" && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <select
                    value={selectedMonth}
                    onChange={(event) =>
                      setSelectedMonth(
                        event.target.value
                      )
                    }
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="Jan">
                      January
                    </option>
                    <option value="Feb">
                      February
                    </option>
                    <option value="Mar">
                      March
                    </option>
                    <option value="Apr">
                      April
                    </option>
                    <option value="May">
                      May
                    </option>
                    <option value="Jun">
                      June
                    </option>
                    <option value="Jul">
                      July
                    </option>
                    <option value="Aug">
                      August
                    </option>
                    <option value="Sep">
                      September
                    </option>
                    <option value="Oct">
                      October
                    </option>
                    <option value="Nov">
                      November
                    </option>
                    <option value="Dec">
                      December
                    </option>
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(event) =>
                      setSelectedYear(
                        event.target.value
                      )
                    }
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option
                      value={
                        currentYearStr
                      }
                    >
                      {currentYearStr}
                    </option>

                    <option value="2025">
                      2025
                    </option>

                    <option value="2024">
                      2024
                    </option>
                  </select>
                </div>
              )}

              {reportTimeframe ===
                "yearly" && (
                <div className="mt-4">
                  <select
                    value={selectedYear}
                    onChange={(event) =>
                      setSelectedYear(
                        event.target.value
                      )
                    }
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option
                      value={
                        currentYearStr
                      }
                    >
                      {currentYearStr}
                    </option>

                    <option value="2025">
                      2025
                    </option>

                    <option value="2024">
                      2024
                    </option>
                  </select>
                </div>
              )}

              {reportTimeframe ===
                "custom" && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex flex-col lg:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-black text-slate-600 mb-1.5">
                        From
                      </label>

                      <input
                        type="date"
                        value={fromDate}
                        onChange={(event) =>
                          setFromDate(
                            event.target.value
                          )
                        }
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs font-black text-slate-600 mb-1.5">
                        To
                      </label>

                      <input
                        type="date"
                        value={toDate}
                        min={fromDate}
                        onChange={(event) =>
                          setToDate(
                            event.target.value
                          )
                        }
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs font-black text-slate-600 mb-1.5">
                        Report Type
                      </label>

                      <select
                        value={customReportType}
                        onChange={(event) =>
                          setCustomReportType(
                            event.target
                              .value as CustomReportType
                          )
                        }
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="all">
                          All Reports
                        </option>

                        <option value="resolved">
                          Resolved Reports
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 pt-5 print:hidden">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                <p className="text-xs font-bold text-emerald-800">
                  {filteredReports.length}{" "}
                  report
                  {filteredReports.length ===
                  1
                    ? ""
                    : "s"}{" "}
                  displayed
                </p>
              </div>
            </div>

            <div className="px-6 py-6">
              <div className="hidden print:block text-center mb-6">
                <h3 className="text-lg font-black text-emerald-900">
                  {reportTimeframe ===
                  "today"
                    ? "Today's Waste Report"
                    : reportTimeframe ===
                      "monthly"
                    ? `${selectedMonth} ${selectedYear} Monthly Waste Report`
                    : reportTimeframe ===
                      "yearly"
                    ? `${selectedYear} Yearly Waste Report`
                    : reportTimeframe ===
                      "custom"
                    ? `${fromDate} to ${toDate} Custom Waste Report`
                    : "Official Resolved Waste Reports"}
                </h3>
              </div>

              {loading ? (
                <div className="py-16 text-center">
                  <p className="text-sm font-bold text-slate-400">
                    Loading official waste reports...
                  </p>
                </div>
              ) : filteredReports.length ===
                0 ? (
                <div className="py-16 text-center border border-dashed border-slate-300 rounded-2xl">
                  <p className="text-sm font-bold text-slate-400">
                    {getEmptyMessage()}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-emerald-200 rounded-2xl">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="bg-emerald-800 text-white font-bold text-xs uppercase tracking-wide">
                        <th className="py-3 px-4 border-r border-emerald-700 w-12 text-center">
                          #
                        </th>

                        <th className="py-3 px-4 border-r border-emerald-700">
                          Site Name / Location
                        </th>

                        <th className="py-3 px-4 border-r border-emerald-700">
                          Reporter Resident
                        </th>

                        <th className="py-3 px-4 border-r border-emerald-700">
                          Waste Category
                        </th>

                        <th className="py-3 px-4 border-r border-emerald-700 text-center">
                          Status
                        </th>

                        <th className="py-3 px-4 border-r border-emerald-700">
                          Time / Date
                        </th>

                        <th className="py-3 px-4 text-right print:hidden">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredReports.map(
                        (
                          report,
                          index
                        ) => {
                          const reporterName =
                            report.reporter_name ||
                            report.profiles
                              ?.full_name ||
                            "Anonymous Resident";

                          const date =
                            new Date(
                              report.created_at
                            );

                          const formattedDate =
                            date.toLocaleDateString(
                              "en-US",
                              {
                                month:
                                  "short",
                                day:
                                  "numeric",
                                year:
                                  "numeric",
                              }
                            ) +
                            " " +
                            date.toLocaleTimeString(
                              "en-US",
                              {
                                hour:
                                  "2-digit",
                                minute:
                                  "2-digit",
                                hour12:
                                  true,
                              }
                            );

                          return (
                            <tr
                              key={
                                report.id
                              }
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="py-3 px-4 border-r border-slate-200 font-bold text-center text-slate-700">
                                {index +
                                  1}
                              </td>

                              <td className="py-3 px-4 border-r border-slate-200 font-bold text-slate-900">
                                {report.location_name ||
                                  "Barangay Tankulan, Manolo Fortich"}
                              </td>

                              <td className="py-3 px-4 border-r border-slate-200 font-medium text-slate-700">
                                {
                                  reporterName
                                }
                              </td>

                              <td className="py-3 px-4 border-r border-slate-200 font-semibold text-slate-800">
                                {report.waste_type ||
                                  report.title ||
                                  "Uncategorized"}
                              </td>

                              <td className="py-3 px-4 border-r border-slate-200 text-center">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(
                                    report.status
                                  )}`}
                                >
                                  {
                                    report.status
                                  }
                                </span>
                              </td>

                              <td className="py-3 px-4 border-r border-slate-200 font-mono text-xs text-slate-600">
                                {
                                  formattedDate
                                }
                              </td>

                              <td className="py-3 px-4 text-right print:hidden">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/report/${report.id}`
                                    )
                                  }
                                  className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pt-5 flex justify-end print:hidden">
                <button
                  type="button"
                  onClick={
                    handlePrintReport
                  }
                  className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs rounded-xl shadow-md transition-all"
                >
                  Print
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <style>{`
        @media print {
          body {
            background: white !important;
          }

          @page {
            size: landscape;
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
}