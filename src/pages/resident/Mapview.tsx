import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { FiArrowLeft, FiHome, FiFileText, FiMap, FiUser } from "react-icons/fi";
import { getMapReports } from "../../lib/Map";
import type { MapReport } from "../../lib/Map";

const DEFAULT_CENTER: [number, number] = [8.360839, 124.867628];
const DEFAULT_ZOOM = 15;

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#dc2626",
  High: "#f97316",
  Moderate: "#eab308",
  Low: "#16a34a",
  "Very Low": "#0ea5e9",
};

const DEFAULT_COLOR = "#94a3b8";

function getMarkerColor(severity: string | null) {
  if (!severity) return DEFAULT_COLOR;
  return SEVERITY_COLORS[severity] ?? DEFAULT_COLOR;
}

export default function MapView() {
  const navigate = useNavigate();

  const [reports, setReports] = useState<MapReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const data = await getMapReports();
        if (isMounted) setReports(data);
      } catch (err) {
        console.error("Failed to load map reports:", err);
        if (isMounted) {
          setErrorMessage("Couldn't load reports on the map.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const center: [number, number] =
    reports.length > 0
      ? [
          reports.reduce((sum, r) => sum + r.latitude, 0) / reports.length,
          reports.reduce((sum, r) => sum + r.longitude, 0) / reports.length,
        ]
      : DEFAULT_CENTER;

  return (
    <div className="flex min-h-screen flex-col bg-white pb-16">
      <div className="flex items-center gap-3 bg-white px-5 py-5 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="rounded-full p-2 text-green-700 transition hover:bg-green-50"
        >
          <FiArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Map View</h1>
      </div>

      {errorMessage && (
        <div className="mx-5 mt-3 rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="relative flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Loading map...
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={DEFAULT_ZOOM}
            className="h-full w-full"
            style={{ minHeight: "60vh" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {reports.map((report) => (
              <CircleMarker
                key={report.id}
                center={[report.latitude, report.longitude]}
                radius={10}
                pathOptions={{
                  color: getMarkerColor(report.severity),
                  fillColor: getMarkerColor(report.severity),
                  fillOpacity: 0.85,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="w-48">
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
                      {new Date(report.created_at).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" }
                      )}
                    </p>
                    <span
                      className="mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold text-white"
                      style={{
                        backgroundColor: getMarkerColor(report.severity),
                      }}
                    >
                      {report.severity ?? "Unclassified"}
                    </span>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-gray-100 bg-white px-4 py-3 text-xs">
        {Object.entries(SEVERITY_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            {label}
          </div>
        ))}
      </div>

      <nav className="fixed inset-x-0 bottom-0 flex items-center justify-around border-t border-gray-200 bg-white py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
        <Link
          to="/dashboard"
          className="flex flex-col items-center gap-1 text-xs font-medium text-gray-400"
        >
          <FiHome size={20} />
          Home
        </Link>
        <Link
          to="/reports"
          className="flex flex-col items-center gap-1 text-xs font-medium text-gray-400"
        >
          <FiFileText size={20} />
          Reports
        </Link>
        <Link
          to="/map"
          className="flex flex-col items-center gap-1 text-xs font-medium text-green-700"
        >
          <FiMap size={20} />
          Map
        </Link>
        <Link
          to="/profile"
          className="flex flex-col items-center gap-1 text-xs font-medium text-gray-400"
        >
          <FiUser size={20} />
          Profile
        </Link>
      </nav>
    </div>
  );
}