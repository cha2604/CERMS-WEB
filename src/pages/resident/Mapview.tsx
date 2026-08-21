import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { getMapReports } from "../../lib/Map";
import type { MapReport } from "../../lib/Map";
import ResidentLayout from "../../pages/resident/Layout";
import "leaflet/dist/leaflet.css";

const TANKULAN_CENTER: [number, number] = [8.360839, 124.867628];
const DEFAULT_ZOOM = 15;

const TANKULAN_BOUNDS: [[number, number], [number, number]] = [
  [8.3400, 124.8350],
  [8.3850, 124.8950]
];

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

function FlyToMarker({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 17, { duration: 1.2 });
    }
  }, [coords, map]);
  return null;
}

export default function MapView() {
  const [reports, setReports] = useState<MapReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [mapTile, setMapTile] = useState<"street" | "satellite">("satellite");
  const [activeCoords, setActiveCoords] = useState<[number, number] | null>(null);

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

  return (
    <ResidentLayout title="Barangay Tankulan Map View">
      {errorMessage && (
        <div className="mx-4 mt-2 rounded-xl bg-red-50 p-3 text-center text-xs text-red-700 font-semibold">
          {errorMessage}
        </div>
      )}

      <div className="relative w-full h-[85vh] rounded-2xl overflow-hidden shadow-lg border border-slate-200">
        <div className="absolute right-3 top-3 z-[1000] flex rounded-xl bg-white/95 p-1 shadow-md backdrop-blur-md border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMapTile("street")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              mapTile === "street"
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => setMapTile("satellite")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              mapTile === "satellite"
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Satellite
          </button>
        </div>

        <div className="absolute left-3 bottom-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-md text-xs font-bold text-slate-700 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
          <span>Bounded: <strong>Barangay Tankulan</strong></span>
        </div>

        {loading ? (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500 bg-slate-100">
            Loading Barangay Tankulan Geotagged Map...
          </div>
        ) : (
          <MapContainer
            center={TANKULAN_CENTER}
            zoom={DEFAULT_ZOOM}
            minZoom={14}
            maxZoom={18}
            maxBounds={TANKULAN_BOUNDS}
            maxBoundsViscosity={1.0}
            style={{ height: "100%", width: "100%" }}
          >
            <FlyToMarker coords={activeCoords} />

            {mapTile === "street" ? (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            ) : (
              <TileLayer
                attribution="Tiles &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            )}

            {reports.map((report) => (
              <CircleMarker
                key={report.id}
                center={[report.latitude, report.longitude]}
                radius={13}
                pathOptions={{
                  color: "#ffffff",
                  fillColor: getMarkerColor(report.severity),
                  fillOpacity: 0.95,
                  weight: 3,
                }}
                eventHandlers={{
                  click: () => {
                    setActiveCoords([report.latitude, report.longitude]);
                  },
                }}
              >
                <Popup autoPan={true}>
                  <div className="w-60 p-1 text-slate-800">
                    <div className="relative mb-2 h-36 w-full overflow-hidden rounded-xl bg-slate-100 shadow-sm border border-slate-200">
                      {report.image_urls && report.image_urls.length > 0 ? (
                        <img
                          src={report.image_urls[0]}
                          alt={report.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400 font-semibold">
                          No Place Photo Available
                        </div>
                      )}

                      <span
                        className="absolute top-2 right-2 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-md uppercase tracking-wider"
                        style={{ backgroundColor: getMarkerColor(report.severity) }}
                      >
                        {report.severity ?? "Unclassified"}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-sm leading-tight mb-1">
                      {report.title}
                    </h4>

                    <p className="text-xs text-slate-600 mb-2 leading-snug">
                      Barangay Tankulan, Manolo Fortich
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 font-medium">
                      <span>
                        {new Date(report.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="font-mono text-emerald-700 font-bold">
                        {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 bg-white px-4 py-3 text-xs font-bold shadow-sm">
        {Object.entries(SEVERITY_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-full shadow-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-slate-700">{label}</span>
          </div>
        ))}
      </div>
    </ResidentLayout>
  );
}