import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from "react-leaflet";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { supabase } from "../../lib/supabase";
import {
  getMonthlyReportTrends,
  type MonthlyCount,
} from "../../lib/ZoneQueries";
import AdminMap from "./Map";
import "leaflet/dist/leaflet.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler
);

const TANKULAN_CENTER: [number, number] = [
  8.360839,
  124.867628,
];

const TANKULAN_BOUNDS: [
  [number, number],
  [number, number]
] = [
  [8.3400, 124.8350],
  [8.3850, 124.8950],
];

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

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<
    MonthlyCount[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<
    "dashboard" | "map" | "reports"
  >("dashboard");

  const [reportTimeframe, setReportTimeframe] =
    useState<
      "today" | "monthly" | "yearly" | "resolved"
    >("monthly");

  const currentMonthStr = new Date().toLocaleString(
    "en-US",
    {
      month: "short",
    }
  );

  const currentYearStr = new Date().getFullYear().toString();

  const [selectedMonth, setSelectedMonth] =
    useState<string>(currentMonthStr);

  const [selectedYear, setSelectedYear] =
    useState<string>(currentYearStr);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        const [reportsRes, monthlyRes] =
          await Promise.all([
            supabase
              .from("reports")
              .select("*, profiles(full_name)")
              .order("created_at", {
                ascending: false,
              }),
            getMonthlyReportTrends(),
          ]);

        if (reportsRes.data) {
          setReports(
            reportsRes.data as ReportRecord[]
          );
        }

        if (monthlyRes) {
          setMonthlyTrends(monthlyRes);
        }
      } catch (err) {
        console.error(
          "Failed to fetch dashboard data:",
          err
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const totalReports = reports.length;

  const pendingCount = reports.filter(
    (r) => r.status === "Pending"
  ).length;

  const resolvedCount = reports.filter(
    (r) => r.status === "Resolved"
  ).length;

  const rejectedCount = reports.filter(
    (r) => r.status === "Rejected"
  ).length;

  const activeMapReports = reports.filter(
    (r) =>
      r.status !== "Resolved" &&
      r.status !== "Rejected" &&
      typeof r.latitude === "number" &&
      typeof r.longitude === "number" &&
      r.latitude !== null &&
      r.longitude !== null
  );

  const severityCounts = {
    Low: reports.filter(
      (r) =>
        r.severity?.trim().toLowerCase() === "low"
    ).length,

    Moderate: reports.filter(
      (r) =>
        r.severity?.trim().toLowerCase() ===
        "moderate"
    ).length,

    High: reports.filter(
      (r) =>
        r.severity?.trim().toLowerCase() === "high"
    ).length,
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getStatusBadgeClass = (status: string) => {
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

  const filteredReports = reports.filter((r) => {
    const query = searchQuery.trim().toLowerCase();

    const reporter = (
      r.reporter_name ||
      r.profiles?.full_name ||
      ""
    ).toLowerCase();

    const location = (
      r.location_name || ""
    ).toLowerCase();

    const titleOrType = (
      r.waste_type || r.title || ""
    ).toLowerCase();

    const id = (r.id || "").toLowerCase();

    const matchesQuery =
      !query ||
      id.includes(query) ||
      titleOrType.includes(query) ||
      reporter.includes(query) ||
      location.includes(query);

    if (!matchesQuery) {
      return false;
    }

    if (activeView === "reports") {
      const reportDate = new Date(r.created_at);

      if (reportTimeframe === "today") {
        const today = new Date();

        return (
          reportDate.getDate() ===
            today.getDate() &&
          reportDate.getMonth() ===
            today.getMonth() &&
          reportDate.getFullYear() ===
            today.getFullYear()
        );
      }

      if (reportTimeframe === "monthly") {
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

        const targetMonth =
          monthMap[selectedMonth];

        return (
          targetMonth !== undefined &&
          reportDate.getMonth() ===
            targetMonth &&
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

      if (reportTimeframe === "resolved") {
        return r.status === "Resolved";
      }
    }

    return true;
  });

  const lineChartData = {
    labels: monthlyTrends.map(
      (m) => m.month
    ),
    datasets: [
      {
        label: "Reports",
        data: monthlyTrends.map(
          (m) => m.count
        ),
        borderColor: "#16a34a",
        backgroundColor:
          "rgba(22, 163, 74, 0.15)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor:
          "#16a34a",
      },
    ],
  };

  const severityChartData = {
    labels: [
      "Low",
      "Moderate",
      "High",
    ],
    datasets: [
      {
        label: "Reports",
        data: [
          severityCounts.Low,
          severityCounts.Moderate,
          severityCounts.High,
        ],
        backgroundColor: [
          "#22c55e",
          "#f59e0b",
          "#f97316",
        ],
        borderColor: [
          "#16a34a",
          "#d97706",
          "#ea580c",
        ],
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
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

    if (reportTimeframe === "resolved") {
      return "No resolved reports found.";
    }

    return "No reports available.";
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
              setActiveView("dashboard")
            }
            className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
              activeView === "dashboard"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveView("map")
            }
            className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
              activeView === "map"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Geotagged Map
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveView("reports")
            }
            className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
              activeView === "reports"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Reports
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/admin/users")
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            People
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
            BARANGAY TANKULAN ENVIRONMENTAL OFFICE
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

        {activeView === "dashboard" && (
          <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4 print:hidden">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                  )
                }
                placeholder="Search concern reports..."
                className="w-full max-w-md px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-100/70 p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase">
                  Total Concerns
                </p>

                <h3 className="text-3xl font-black text-slate-900 mt-1">
                  {totalReports}
                </h3>
              </div>

              <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 shadow-sm">
                <p className="text-xs font-bold text-amber-800 uppercase">
                  Pending Review
                </p>

                <h3 className="text-3xl font-black text-amber-900 mt-1">
                  {pendingCount}
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-base font-extrabold text-slate-900">
                  Geotagged Report Locations Map
                </h3>

                <div className="h-80 w-full overflow-hidden rounded-2xl border border-slate-200 relative">
                  <MapContainer
                    center={TANKULAN_CENTER}
                    zoom={15}
                    minZoom={14}
                    maxZoom={18}
                    maxBounds={
                      TANKULAN_BOUNDS
                    }
                    maxBoundsViscosity={1.0}
                    style={{
                      height: "100%",
                      width: "100%",
                    }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {activeMapReports.map(
                      (r) => (
                        <CircleMarker
                          key={r.id}
                          center={[
                            r.latitude!,
                            r.longitude!,
                          ]}
                          radius={10}
                          pathOptions={{
                            color:
                              "#ffffff",
                            fillColor:
                              r.status ===
                                "Ongoing" ||
                              r.status ===
                                "On-going"
                                ? "#10b981"
                                : "#f59e0b",
                            fillOpacity: 0.9,
                            weight: 2,
                          }}
                        >
                          <Popup
                            autoPan={
                              true
                            }
                          >
                            <div className="p-1 text-slate-800 w-56">
                              {r.image_urls &&
                                r
                                  .image_urls
                                  .length >
                                  0 && (
                                  <div className="relative mb-2 h-32 w-full overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                                    <img
                                      src={
                                        r
                                          .image_urls[0]
                                      }
                                      alt={
                                        r.title
                                      }
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                )}

                              <h4 className="font-extrabold text-sm text-slate-900">
                                {r.waste_type ||
                                  r.title}
                              </h4>

                              <p className="text-xs font-bold text-emerald-800 mt-1 leading-snug">
                                {r.location_name ||
                                  "Barangay Tankulan, Manolo Fortich"}
                              </p>

                              {r.severity && (
                                <p className="text-xs font-bold text-slate-600 mt-1">
                                  Severity:{" "}
                                  {r.severity}
                                </p>
                              )}
                            </div>
                          </Popup>
                        </CircleMarker>
                      )
                    )}
                  </MapContainer>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Severity Distribution
                    </h3>

                    <p className="text-xs text-slate-500 mt-1">
                      Number of reports by severity level
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Total
                    </p>

                    <p className="text-xl font-black text-slate-900">
                      {severityCounts.Low +
                        severityCounts.Moderate +
                        severityCounts.High}
                    </p>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <Bar
                    data={
                      severityChartData
                    }
                    options={{
                      responsive: true,
                      maintainAspectRatio:
                        false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: (
                              context
                            ) =>
                              ` ${context.parsed.y} report${
                                context.parsed
                                  .y ===
                                1
                                  ? ""
                                  : "s"
                              }`,
                          },
                        },
                      },
                      scales: {
                        x: {
                          grid: {
                            display: false,
                          },
                        },
                        y: {
                          beginAtZero: true,
                          ticks: {
                            precision: 0,
                            stepSize: 1,
                          },
                          title: {
                            display: true,
                            text: "Number of Reports",
                          },
                        },
                      },
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase">
                      Low
                    </p>

                    <p className="text-2xl font-black text-emerald-900 mt-1">
                      {severityCounts.Low}
                    </p>
                  </div>

                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
                    <p className="text-[10px] font-bold text-amber-700 uppercase">
                      Moderate
                    </p>

                    <p className="text-2xl font-black text-amber-900 mt-1">
                      {severityCounts.Moderate}
                    </p>
                  </div>

                  <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
                    <p className="text-[10px] font-bold text-orange-700 uppercase">
                      High
                    </p>

                    <p className="text-2xl font-black text-orange-900 mt-1">
                      {severityCounts.High}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">
                Monthly Concern Volume Trends
              </h3>

              <div className="h-64 w-full pt-2">
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
            </div>
          </div>
        )}

        {activeView === "map" && (
          <AdminMap />
        )}

        {activeView === "reports" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 print:hidden">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Official Waste Report
                </h3>

                <p className="text-xs text-slate-500">
                  Barangay Tankulan Waste Management &
                  Monitoring Summaries
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(
                      e.target.value
                    )
                  }
                  placeholder="Search reports..."
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />

                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700">
                  <button
                    type="button"
                    onClick={() =>
                      setReportTimeframe(
                        "today"
                      )
                    }
                    className={`px-3.5 py-2 rounded-lg transition-all ${
                      reportTimeframe ===
                      "today"
                        ? "bg-emerald-800 text-white shadow-sm"
                        : "hover:bg-slate-200"
                    }`}
                  >
                    Today
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setReportTimeframe(
                        "monthly"
                      )
                    }
                    className={`px-3.5 py-2 rounded-lg transition-all ${
                      reportTimeframe ===
                      "monthly"
                        ? "bg-emerald-800 text-white shadow-sm"
                        : "hover:bg-slate-200"
                    }`}
                  >
                    Monthly Report
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setReportTimeframe(
                        "yearly"
                      )
                    }
                    className={`px-3.5 py-2 rounded-lg transition-all ${
                      reportTimeframe ===
                      "yearly"
                        ? "bg-emerald-800 text-white shadow-sm"
                        : "hover:bg-slate-200"
                    }`}
                  >
                    Yearly Report
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setReportTimeframe(
                        "resolved"
                      )
                    }
                    className={`px-3.5 py-2 rounded-lg transition-all ${
                      reportTimeframe ===
                      "resolved"
                        ? "bg-emerald-700 text-white shadow-sm font-black"
                        : "hover:bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    Resolved Reports (
                    {resolvedCount})
                  </button>
                </div>

                {reportTimeframe ===
                  "monthly" && (
                  <select
                    value={selectedMonth}
                    onChange={(e) =>
                      setSelectedMonth(
                        e.target.value
                      )
                    }
                    className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
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
                    onChange={(e) =>
                      setSelectedYear(
                        e.target.value
                      )
                    }
                    className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
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
              </div>
            </div>

            <div className="text-center print:block hidden mb-4">
              <h4 className="text-lg font-black text-emerald-900">
                {reportTimeframe ===
                "today"
                  ? "Today's Concern Log Summary"
                  : reportTimeframe ===
                    "monthly"
                  ? `${selectedMonth} ${selectedYear} Monthly Waste Report`
                  : reportTimeframe ===
                    "resolved"
                  ? "Official Resolved Waste Reports Summary"
                  : `${selectedYear} Yearly Waste Report`}
              </h4>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm font-semibold text-slate-400">
                Loading official waste reports...
              </div>
            ) : filteredReports.length ===
              0 ? (
              <div className="py-12 text-center text-sm font-semibold text-slate-400">
                {getEmptyMessage()}
              </div>
            ) : (
              <div className="overflow-x-auto border border-emerald-200 rounded-xl">
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
                      (r, index) => {
                        const reporterName =
                          r.reporter_name ||
                          r.profiles
                            ?.full_name ||
                          "Anonymous Resident";

                        const formattedDate =
                          new Date(
                            r.created_at
                          ).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          ) +
                          " " +
                          new Date(
                            r.created_at
                          ).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            }
                          );

                        return (
                          <tr
                            key={r.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-3 px-4 border-r border-slate-200 font-bold text-center text-slate-700">
                              {index + 1}
                            </td>

                            <td className="py-3 px-4 border-r border-slate-200 font-bold text-slate-900">
                              {r.location_name ||
                                "Barangay Tankulan, Manolo Fortich"}
                            </td>

                            <td className="py-3 px-4 border-r border-slate-200 font-medium text-slate-700">
                              {reporterName}
                            </td>

                            <td className="py-3 px-4 border-r border-slate-200 font-semibold text-slate-800">
                              {r.waste_type ||
                                r.title ||
                                "Uncategorized"}
                            </td>

                            <td className="py-3 px-4 border-r border-slate-200 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeClass(
                                  r.status
                                )}`}
                              >
                                {r.status}
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
                                    `/admin/report/${r.id}`
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

            <div className="pt-4 flex justify-end print:hidden">
              <button
                type="button"
                onClick={
                  handlePrintReport
                }
                className="flex items-center gap-2 px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Print
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}