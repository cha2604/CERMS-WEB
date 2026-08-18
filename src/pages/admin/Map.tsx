import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { FiGrid, FiFileText, FiMap, FiBarChart2, FiUsers, FiSettings, FiLogOut } from "react-icons/fi";
import { supabase } from "../../lib/supabase";
import { getAllAdminReports, type AdminReportDetail } from "../../lib/AdminReport";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [8.360839, 124.867628];
const DEFAULT_ZOOM = 14;

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#dc2626",
  High: "#f97316",
  Moderate: "#eab308",
  Low: "#16a34a",
  "Very Low": "#0ea5e9",
};

const DEFAULT_COLOR = "#94a3b8";

const NAV_ITEMS = [
  { label: "Dashboard", icon: FiGrid, to: "/admin/dashboard" },
  { label: "Reports", icon: FiFileText, to: "/admin/reports" },
  { label: "Map", icon: FiMap, to: "/admin/map" },
  { label: "Analytics", icon: FiBarChart2, to: "/admin/analytics" },
  { label: "Users", icon: FiUsers, to: "/admin/users" },
  { label: "Settings", icon: FiSettings, to: "/admin/settings" },
];

function getMarkerColor(severity: string | null) {
  if (!severity) return DEFAULT_COLOR;
  return SEVERITY_COLORS[severity] ?? DEFAULT_COLOR;
}

export default function AdminMap() {
  const navigate = useNavigate();

  const [reports, setReports] = useState<AdminReportDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const data = await getAllAdminReports("All");
        if (isMounted) {
          setReports(data.filter((r) => r.latitude !== null && r.longitude !== null));
        }
      } catch (err) {
        console.error("Failed to load reports for map:", err);
        if (isMounted) setErrorMessage("Couldn't load reports on the map.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  const center: [number, number] =
    reports.length > 0
      ? [
          reports.reduce((sum, r) => sum + (r.latitude as number), 0) / reports.length,
          reports.reduce((sum, r) => sum + (r.longitude as number), 0) / reports.length,
        ]
      : DEFAULT_CENTER;

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
            const active = item.label === "Map";
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

      <main className="flex flex-1 flex-col">
        <div className="border-b border-gray-200 bg-white px-8 py-4">
          <h1 className="text-xl font-bold text-slate-800">Map View</h1>
        </div>

        {errorMessage && (
          <div className="mx-8 mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="relative flex-1 p-8 pt-4">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Loading map...
            </div>
          ) : (
            <div className="h-full overflow-hidden rounded-2xl shadow-sm">
              <MapContainer
                center={center}
                zoom={DEFAULT_ZOOM}
                className="h-full w-full"
                style={{ minHeight: "70vh" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {reports.map((report) => (
                  <CircleMarker
                    key={report.id}
                    center={[report.latitude as number, report.longitude as number]}
                    radius={10}
                    pathOptions={{
                      color: getMarkerColor(report.severity),
                      fillColor: getMarkerColor(report.severity),
                      fillOpacity: 0.85,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="w-52">
                        {report.image_urls.length > 0 && (
                          <img
                            src={report.image_urls[0]}
                            alt={report.title}
                            className="mb-2 h-24 w-full rounded-lg object-cover"
                          />
                        )}
                        <p className="font-semibold text-slate-800">
                          {report.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {report.reporter_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(report.created_at).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </p>
                        <span
                          className="mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold text-white"
                          style={{ backgroundColor: getMarkerColor(report.severity) }}
                        >
                          {report.severity ?? "Unclassified"}
                        </span>
                        <button
                          onClick={() => navigate(`/admin/reports/${report.id}`)}
                          className="mt-3 w-full rounded-lg bg-green-700 py-1.5 text-xs font-semibold text-white transition hover:bg-green-800"
                        >
                          View Details
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 border-t border-gray-100 bg-white px-4 py-3 text-xs">
          {Object.entries(SEVERITY_COLORS).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}