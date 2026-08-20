import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { getMapReports } from "../../lib/Map";
import type { MapReport } from "../../lib/Map";
import ResidentLayout from "../../pages/resident/Layout";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [8.360839, 124.867628];
const DEFAULT_ZOOM = 16;

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
    <ResidentLayout title="Map View">
      {errorMessage && (
        <div className="mx-5 mt-3 rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="relative" style={{ height: "70vh" }}>
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Loading map...
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={DEFAULT_ZOOM}
            style={{ height: "100%", width: "100%" }}
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
                      style={{ backgroundColor: getMarkerColor(report.severity) }}
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
    </ResidentLayout>
  );
}