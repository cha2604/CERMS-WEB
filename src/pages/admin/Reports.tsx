import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { supabase } from "../../lib/supabase";
import {
  getMonthlyReportTrends,
  type MonthlyCount,
} from "../../lib/ZoneQueries";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

type ReportTab = "overview" | "reports";

type ReportTimeframe =
  | "today"
  | "monthly"
  | "yearly"
  | "custom"
  | "resolved";

interface ReportRecord {
  id: string;
  title: string | null;
  waste_type: string | null;
  description: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  image_urls: string[] | null;
  status:
    | "Pending"
    | "Ongoing"
    | "On-going"
    | "Resolved"
    | "Rejected"
    | "Draft";
  severity: string | null;
  created_at: string;
  reporter_name?: string | null;
  profiles?: {
    full_name?: string | null;
  } | null;
}

function normalizeStatus(status: string) {
  return status === "On-going" ? "Ongoing" : status;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  return (
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " " +
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );
}

function getLocalDateKey(value: string) {
  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameDay(value: string, date: Date) {
  const target = new Date(value);

  return (
    target.getDate() === date.getDate() &&
    target.getMonth() === date.getMonth() &&
    target.getFullYear() === date.getFullYear()
  );
}

function getStatusBadgeClass(status: string) {
  switch (normalizeStatus(status)) {
    case "Pending":
      return "bg-amber-100 text-amber-800 border-amber-300";

    case "Ongoing":
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
}

export default function Reports() {
  const navigate = useNavigate();

  const [reports, setReports] = useState<
    ReportRecord[]
  >([]);

  const [monthlyTrends, setMonthlyTrends] =
    useState<MonthlyCount[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState<ReportTab>("reports");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [reportTimeframe, setReportTimeframe] =
    useState<ReportTimeframe>("today");

  const currentMonth =
    new Date().toLocaleString("en-US", {
      month: "short",
    });

  const currentYear =
    new Date().getFullYear().toString();

  const [selectedMonth, setSelectedMonth] =
    useState(currentMonth);

  const [selectedYear, setSelectedYear] =
    useState(currentYear);

  const [fromDate, setFromDate] =
    useState("");

  const [toDate, setToDate] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        setErrorMessage("");

        const [
          reportsResult,
          trendsResult,
        ] = await Promise.all([
          supabase
            .from("reports")
            .select(
              "id, title, waste_type, description, location_name, latitude, longitude, image_urls, status, severity, created_at, reporter_name, profiles(full_name)"
            )
            .order("created_at", {
              ascending: false,
            }),

          getMonthlyReportTrends(),
        ]);

        if (reportsResult.error) {
          throw reportsResult.error;
        }

        setReports(
          (reportsResult.data ||
            []) as ReportRecord[]
        );

        setMonthlyTrends(
          trendsResult || []
        );
      } catch (error) {
        console.error(
          "Failed to load reports:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load reports."
        );
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setErrorMessage("");

      const [
        reportsResult,
        trendsResult,
      ] = await Promise.all([
        supabase
          .from("reports")
          .select(
            "id, title, waste_type, description, location_name, latitude, longitude, image_urls, status, severity, created_at, reporter_name, profiles(full_name)"
          )
          .order("created_at", {
            ascending: false,
          }),

        getMonthlyReportTrends(),
      ]);

      if (reportsResult.error) {
        throw reportsResult.error;
      }

      setReports(
        (reportsResult.data ||
          []) as ReportRecord[]
      );

      setMonthlyTrends(
        trendsResult || []
      );
    } catch (error) {
      console.error(
        "Failed to refresh reports:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to refresh reports."
      );
    } finally {
      setRefreshing(false);
    }
  };

  const totalReports =
    reports.length;

  const pendingCount =
    reports.filter(
      (report) =>
        normalizeStatus(
          report.status
        ) === "Pending"
    ).length;

  const ongoingCount =
    reports.filter(
      (report) =>
        normalizeStatus(
          report.status
        ) === "Ongoing"
    ).length;

  const resolvedCount =
    reports.filter(
      (report) =>
        normalizeStatus(
          report.status
        ) === "Resolved"
    ).length;

  const filteredReports = useMemo(() => {
    const query =
      searchQuery
        .trim()
        .toLowerCase();

    const monthMap: Record<
      string,
      number
    > = {
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

    return reports.filter(
      (report) => {
        const reporter =
          (
            report.reporter_name ||
            report.profiles
              ?.full_name ||
            ""
          ).toLowerCase();

        const location =
          (
            report.location_name ||
            ""
          ).toLowerCase();

        const wasteType =
          (
            report.waste_type ||
            report.title ||
            ""
          ).toLowerCase();

        const id =
          report.id.toLowerCase();

        const matchesSearch =
          !query ||
          id.includes(query) ||
          reporter.includes(query) ||
          location.includes(query) ||
          wasteType.includes(query);

        if (!matchesSearch) {
          return false;
        }

        const reportDate =
          new Date(
            report.created_at
          );

        if (
          reportTimeframe ===
          "today"
        ) {
          return isSameDay(
            report.created_at,
            new Date()
          );
        }

        if (
          reportTimeframe ===
          "monthly"
        ) {
          const month =
            monthMap[
              selectedMonth
            ];

          return (
            month !== undefined &&
            reportDate.getMonth() ===
              month &&
            reportDate.getFullYear() ===
              Number(selectedYear)
          );
        }

        if (
          reportTimeframe ===
          "yearly"
        ) {
          return (
            reportDate.getFullYear() ===
            Number(selectedYear)
          );
        }

        if (
          reportTimeframe ===
          "custom"
        ) {
          const reportDateKey =
            getLocalDateKey(
              report.created_at
            );

          if (
            fromDate &&
            reportDateKey <
              fromDate
          ) {
            return false;
          }

          if (
            toDate &&
            reportDateKey >
              toDate
          ) {
            return false;
          }

          return true;
        }

        if (
          reportTimeframe ===
          "resolved"
        ) {
          return (
            normalizeStatus(
              report.status
            ) === "Resolved"
          );
        }

        return true;
      }
    );
  }, [
    reports,
    searchQuery,
    reportTimeframe,
    selectedMonth,
    selectedYear,
    fromDate,
    toDate,
  ]);

  const customDateError =
    reportTimeframe === "custom" &&
    fromDate &&
    toDate &&
    fromDate > toDate;

  const lineChartData = {
    labels: monthlyTrends.map(
      (item) => item.month
    ),

    datasets: [
      {
        label: "Waste Reports",
        data: monthlyTrends.map(
          (item) => item.count
        ),
        borderColor: "#16a34a",
        backgroundColor:
          "rgba(22, 163, 74, 0.14)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor:
          "#16a34a",
      },
    ],
  };

  const getEmptyMessage = () => {
    if (searchQuery) {
      return "No reports matching your search query.";
    }

    if (
      reportTimeframe ===
      "today"
    ) {
      return "No reports submitted today.";
    }

    if (
      reportTimeframe ===
      "monthly"
    ) {
      return `No reports for ${selectedMonth} ${selectedYear} yet.`;
    }

    if (
      reportTimeframe ===
      "yearly"
    ) {
      return `No reports recorded for ${selectedYear} yet.`;
    }

    if (
      reportTimeframe ===
      "custom"
    ) {
      if (customDateError) {
        return "The From date cannot be later than the To date.";
      }

      if (!fromDate && !toDate) {
        return "Select a From and To date.";
      }

      return "No reports found for the selected date range.";
    }

    if (
      reportTimeframe ===
      "resolved"
    ) {
      return "No resolved reports found.";
    }

    return "No reports available.";
  };

  const handlePrint =
    () => {
      window.print();
    };

  const handleLogout =
    async () => {
      await supabase.auth.signOut();
      navigate("/login");
    };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 p-5 flex flex-col print:hidden">
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
            className="w-full text-left px-4 py-3 rounded-xl bg-emerald-800 text-white shadow-sm"
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
            Accounts
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/approval")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            Approval
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/waste-weighing")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            Waste Weighing
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

      <main className="ml-64 min-h-screen p-6 lg:p-8 print:ml-0 print:p-0 print:bg-white">
        <div
          id="print-area"
          className="max-w-7xl mx-auto"
        >
          <div className="hidden print:block text-center border-b-2 border-emerald-800 pb-4 mb-6">
            <p className="text-xs font-black tracking-[0.18em] text-slate-500">
              REPUBLIC OF THE PHILIPPINES
            </p>

            <h1 className="text-2xl font-black text-emerald-900 mt-1">
              BARANGAY TANKULAN
            </h1>

            <p className="text-sm font-bold text-slate-700">
              OFFICIAL WASTE REPORT
            </p>

            <p className="text-[11px] text-slate-500 mt-1">
              Generated{" "}
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

          {errorMessage && (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 print:hidden">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 print:hidden mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                CERMS Reports
              </p>

              <h1 className="text-2xl font-black text-slate-900 mt-1">
                Waste Reports
              </h1>

              <p className="text-sm font-medium text-slate-500 mt-1">
                Review and print official waste-report summaries.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-black shadow-sm hover:bg-emerald-900"
              >
                Print
              </button>
            </div>
          </div>

          <div className="flex bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit mb-6 print:hidden">
            <button
              type="button"
              onClick={() =>
                setActiveTab("overview")
              }
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeTab === "overview"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Overview
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab("reports")
              }
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeTab === "reports"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Reports
            </button>
          </div>

          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Total Waste Reports
                  </p>

                  <p className="text-3xl font-black text-slate-900 mt-2">
                    {totalReports}
                  </p>
                </div>

                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                    Pending Reports
                  </p>

                  <p className="text-3xl font-black text-amber-900 mt-2">
                    {pendingCount}
                  </p>
                </div>

                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                    Ongoing Reports
                  </p>

                  <p className="text-3xl font-black text-blue-900 mt-2">
                    {ongoingCount}
                  </p>
                </div>

                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                    Resolved Reports
                  </p>

                  <p className="text-3xl font-black text-emerald-900 mt-2">
                    {resolvedCount}
                  </p>
                </div>
              </div>

              <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <div className="mb-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                    Report Activity
                  </p>

                  <h2 className="text-lg font-black text-slate-900 mt-1">
                    Monthly Waste Concern Volume
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Monthly count of submitted waste reports.
                  </p>
                </div>

                <div className="h-72 w-full">
                  <Line
                    data={lineChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1,
                          },
                        },
                      },
                    }}
                  />
                </div>
              </section>
            </div>
          )}

          {activeTab === "reports" && (
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 print:hidden">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                        Report Registry
                      </p>

                      <h2 className="text-xl font-black text-slate-900 mt-1">
                        Official Waste Reports
                      </h2>

                      <p className="text-xs text-slate-500 mt-1">
                        Barangay Tankulan waste-management report records.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handlePrint}
                      className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-black shadow-sm hover:bg-emerald-900"
                    >
                      Print
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) =>
                        setSearchQuery(
                          event.target.value
                        )
                      }
                      placeholder="Search reports..."
                      className="min-w-[250px] flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />

                    <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700">
                      {[
                        ["today", "Today"],
                        ["monthly", "Monthly"],
                        ["yearly", "Yearly"],
                        ["custom", "Custom Date"],
                        ["resolved", "Resolved"],
                      ].map(
                        ([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setReportTimeframe(
                                value as ReportTimeframe
                              )
                            }
                            className={`px-3.5 py-2 rounded-lg transition-all ${
                              reportTimeframe ===
                              value
                                ? "bg-emerald-800 text-white shadow-sm"
                                : "hover:bg-slate-200"
                            }`}
                          >
                            {label}
                          </button>
                        )
                      )}
                    </div>

                    {reportTimeframe ===
                      "monthly" && (
                      <select
                        value={selectedMonth}
                        onChange={(event) =>
                          setSelectedMonth(
                            event.target.value
                          )
                        }
                        className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
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
                    )}

                    {(reportTimeframe ===
                      "monthly" ||
                      reportTimeframe ===
                        "yearly") && (
                      <select
                        value={selectedYear}
                        onChange={(event) =>
                          setSelectedYear(
                            event.target.value
                          )
                        }
                        className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                      >
                        <option value="2026">
                          2026
                        </option>
                        <option value="2025">
                          2025
                        </option>
                        <option value="2024">
                          2024
                        </option>
                      </select>
                    )}

                    {reportTimeframe ===
                      "custom" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
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
                            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            To
                          </label>

                          <input
                            type="date"
                            value={toDate}
                            onChange={(event) =>
                              setToDate(
                                event.target.value
                              )
                            }
                            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {reportTimeframe ===
                    "custom" &&
                    customDateError && (
                      <p className="text-xs font-bold text-rose-600">
                        The From date cannot be later than the To date.
                      </p>
                    )}
                </div>
              </div>

              <div className="p-6">
                <div className="hidden print:block text-center mb-6">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                    Barangay Tankulan
                  </p>

                  <h2 className="text-2xl font-black text-slate-900 mt-1">
                    Official Waste Reports
                  </h2>

                  <p className="text-xs font-bold text-slate-500 mt-1">
                    {reportTimeframe ===
                    "today"
                      ? "Today's Waste Reports"
                      : reportTimeframe ===
                        "monthly"
                      ? `${selectedMonth} ${selectedYear} Waste Report`
                      : reportTimeframe ===
                        "yearly"
                      ? `${selectedYear} Waste Report`
                      : reportTimeframe ===
                        "custom"
                      ? `${fromDate || "Start"} to ${toDate || "End"}`
                      : "Resolved Waste Reports"}
                  </p>
                </div>

                {loading ? (
                  <div className="py-16 text-center text-sm font-semibold text-slate-400">
                    Loading waste reports...
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-emerald-800 text-white text-[11px] font-black uppercase tracking-wide">
                          <th className="px-4 py-3">
                            #
                          </th>

                          <th className="px-4 py-3">
                            Site Name / Location
                          </th>

                          <th className="px-4 py-3">
                            Reporter
                          </th>

                          <th className="px-4 py-3">
                            Waste Category
                          </th>

                          <th className="px-4 py-3 text-center">
                            Status
                          </th>

                          <th className="px-4 py-3">
                            Date / Time
                          </th>

                          <th className="px-4 py-3 text-right print:hidden">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200">
                        {filteredReports.length >
                        0 ? (
                          filteredReports.map(
                            (
                              report,
                              index
                            ) => {
                              const reporter =
                                report.reporter_name ||
                                report.profiles
                                  ?.full_name ||
                                "Anonymous Resident";

                              return (
                                <tr
                                  key={
                                    report.id
                                  }
                                  className="hover:bg-slate-50"
                                >
                                  <td className="px-4 py-3 text-xs font-black text-slate-500">
                                    {index +
                                      1}
                                  </td>

                                  <td className="px-4 py-3 text-xs font-extrabold text-slate-900">
                                    {report.location_name ||
                                      "Barangay Tankulan, Manolo Fortich, Bukidnon"}
                                  </td>

                                  <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                                    {reporter}
                                  </td>

                                  <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                                    {report.waste_type ||
                                      report.title ||
                                      "Uncategorized"}
                                  </td>

                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black ${getStatusBadgeClass(
                                        report.status
                                      )}`}
                                    >
                                      {normalizeStatus(
                                        report.status
                                      )}
                                    </span>
                                  </td>

                                  <td className="px-4 py-3 text-[11px] font-mono text-slate-600">
                                    {formatDateTime(
                                      report.created_at
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-right print:hidden">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        navigate(
                                          `/report/${report.id}`
                                        )
                                      }
                                      className="px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-black shadow-sm"
                                    >
                                      View Details
                                    </button>
                                  </td>
                                </tr>
                              );
                            }
                          )
                        ) : (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-16 text-center text-sm font-semibold text-slate-400"
                            >
                              {getEmptyMessage()}
                            </td>
                          </tr>
                        )}
                      </tbody>

                      <tfoot>
                        <tr className="bg-slate-50">
                          <td
                            colSpan={7}
                            className="px-4 py-4"
                          >
                            <div className="flex flex-wrap justify-between gap-3 text-xs font-black text-slate-700">
                              <span>
                                Total Matching Reports:
                              </span>

                              <span className="text-emerald-800">
                                {
                                  filteredReports.length
                                }
                              </span>
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                <div className="hidden print:grid grid-cols-2 gap-12 mt-16 text-xs">
                  <div>
                    <div className="border-b border-slate-400 h-10" />
                    <p className="mt-2 font-bold text-slate-700">
                      Prepared By
                    </p>
                  </div>

                  <div>
                    <div className="border-b border-slate-400 h-10" />
                    <p className="mt-2 font-bold text-slate-700">
                      Reviewed By
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}