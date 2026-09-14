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
  const [monthlyTrends, setMonthlyTrends] =
    useState<MonthlyCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingApprovalCount, setPendingApprovalCount] =
    useState(0);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        const [
          reportsRes,
          monthlyRes,
          approvalsRes,
        ] = await Promise.all([
          supabase
            .from("reports")
            .select("*, profiles(full_name)")
            .order("created_at", {
              ascending: false,
            }),

          getMonthlyReportTrends(),

          supabase
            .from("resident_approvals")
            .select("user_id", {
              count: "exact",
              head: true,
            })
            .eq("status", "pending"),
        ]);

        if (reportsRes.error) {
          throw reportsRes.error;
        }

        if (reportsRes.data) {
          setReports(
            reportsRes.data as ReportRecord[]
          );
        }

        if (monthlyRes) {
          setMonthlyTrends(monthlyRes);
        }

        if (!approvalsRes.error) {
          setPendingApprovalCount(
            approvalsRes.count || 0
          );
        }
      } catch (error) {
        console.error(
          "Failed to fetch dashboard data:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const totalReports = reports.length;

  const pendingCount = reports.filter(
    (report) =>
      report.status === "Pending"
  ).length;

  const ongoingCount = reports.filter(
    (report) =>
      report.status === "Ongoing" ||
      report.status === "On-going"
  ).length;

  const resolvedCount = reports.filter(
    (report) =>
      report.status === "Resolved"
  ).length;

  const rejectedCount = reports.filter(
    (report) =>
      report.status === "Rejected"
  ).length;

  const activeMapReports = reports.filter(
    (report) =>
      report.status !== "Resolved" &&
      report.status !== "Rejected" &&
      typeof report.latitude === "number" &&
      typeof report.longitude === "number"
  );

  const severityCounts = {
    Low: reports.filter(
      (report) =>
        report.severity?.trim().toLowerCase() ===
        "low"
    ).length,

    Moderate: reports.filter(
      (report) =>
        report.severity?.trim().toLowerCase() ===
        "moderate"
    ).length,

    High: reports.filter(
      (report) =>
        report.severity?.trim().toLowerCase() ===
        "high"
    ).length,
  };

  const lineChartData = {
    labels: monthlyTrends.map(
      (month) => month.month
    ),
    datasets: [
      {
        label: "Reports",
        data: monthlyTrends.map(
          (month) => month.count
        ),
        borderColor: "#16a34a",
        backgroundColor:
          "rgba(22, 163, 74, 0.15)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#16a34a",
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

  const handleLogout = async () => {
    await supabase.auth.signOut();

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className="sticky top-0 h-screen w-64 bg-white border-r border-slate-200 p-5 flex flex-col shrink-0 print:hidden">
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

        <nav className="space-y-2 text-sm font-bold flex-1 overflow-y-auto">
          <button
            type="button"
            className="w-full text-left px-4 py-3 rounded-xl bg-emerald-800 text-white shadow-sm"
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
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
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

            {pendingApprovalCount > 0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800">
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

        <div className="mt-auto pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-sm font-bold transition-all"
          >
            Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm font-medium text-slate-500">
            Barangay Tankulan Waste Management & Monitoring
          </p>
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-slate-900">
              Report Overview
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-black text-slate-500 uppercase">
                Total Reports
              </p>

              <p className="text-3xl font-black text-slate-900 mt-2">
                {totalReports}
              </p>
            </div>

            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 shadow-sm">
              <p className="text-xs font-black text-amber-700 uppercase">
                Pending
              </p>

              <p className="text-3xl font-black text-amber-900 mt-2">
                {pendingCount}
              </p>
            </div>

            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 shadow-sm">
              <p className="text-xs font-black text-emerald-700 uppercase">
                Ongoing
              </p>

              <p className="text-3xl font-black text-emerald-900 mt-2">
                {ongoingCount}
              </p>
            </div>

            <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5 shadow-sm">
              <p className="text-xs font-black text-blue-700 uppercase">
                Resolved
              </p>

              <p className="text-3xl font-black text-blue-900 mt-2">
                {resolvedCount}
              </p>
            </div>

            <div className="bg-rose-50 rounded-2xl border border-rose-200 p-5 shadow-sm">
              <p className="text-xs font-black text-rose-700 uppercase">
                Rejected
              </p>

              <p className="text-3xl font-black text-rose-900 mt-2">
                {rejectedCount}
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">
              Geotagged Report Locations
            </h3>

            <div className="h-80 w-full overflow-hidden rounded-2xl border border-slate-200">
              <MapContainer
                center={TANKULAN_CENTER}
                zoom={15}
                minZoom={14}
                maxZoom={18}
                maxBounds={TANKULAN_BOUNDS}
                maxBoundsViscosity={1}
                style={{
                  height: "100%",
                  width: "100%",
                }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {activeMapReports.map(
                  (report) => (
                    <CircleMarker
                      key={report.id}
                      center={[
                        report.latitude as number,
                        report.longitude as number,
                      ]}
                      radius={10}
                      pathOptions={{
                        color: "#ffffff",
                        fillColor:
                          report.status ===
                            "Ongoing" ||
                          report.status ===
                            "On-going"
                            ? "#10b981"
                            : "#f59e0b",
                        fillOpacity: 0.9,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="w-56 p-1">
                          {report.image_urls &&
                            report.image_urls.length >
                              0 && (
                              <div className="h-32 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                <img
                                  src={
                                    report.image_urls[0]
                                  }
                                  alt={
                                    report.title
                                  }
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                          <p className="font-black text-sm text-slate-900">
                            {report.waste_type ||
                              report.title ||
                              "Waste Report"}
                          </p>

                          <p className="text-xs font-bold text-emerald-800 mt-1">
                            {report.location_name ||
                              "Barangay Tankulan, Manolo Fortich"}
                          </p>

                          {report.severity && (
                            <p className="text-xs text-slate-600 mt-1">
                              Severity:{" "}
                              {report.severity}
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/report/${report.id}`
                              )
                            }
                            className="mt-3 w-full bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg py-2 text-xs font-bold"
                          >
                            View Report
                          </button>
                        </div>
                      </Popup>
                    </CircleMarker>
                  )
                )}
              </MapContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
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

            <div className="h-72">
              <Bar
                data={severityChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
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

            <div className="grid grid-cols-3 gap-2 mt-4">
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

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-900">
            Monthly Waste Report Trends
          </h3>

          <div className="h-72 mt-4">
            {loading ? (
              <div className="h-full flex items-center justify-center text-sm font-semibold text-slate-400">
                Loading dashboard data...
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
}