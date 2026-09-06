import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { supabase } from "../../lib/supabase";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [8.360839, 124.867628];
const TANKULAN_BOUNDS: [[number, number], [number, number]] = [
  [8.3500, 124.8520],
  [8.3720, 124.8800]
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
  status: string;
  created_at: string;
}

export default function MapView() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [tileType, setTileType] = useState<"street" | "satellite">("street");

  useEffect(() => {
    async function fetchMapReports() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          setErrorMessage("Failed to load geotagged map pins.");
        } else if (data) {
          setReports(data as ReportRecord[]);
        }
      } catch (err) {
        setErrorMessage("Could not connect to map service.");
      } finally {
        setLoading(false);
      }
    }

    fetchMapReports();
  }, []);

  const activeReports = reports.filter(
    (r) =>
      r.status !== "Resolved" &&
      r.status !== "Rejected" &&
      typeof r.latitude === "number" &&
      typeof r.longitude === "number" &&
      r.latitude !== null &&
      r.longitude !== null
  );

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Barangay Tankulan Map View</h1>
          <p className="text-xs text-slate-500">Live active community concern locations</p>
        </div>

        <div className="flex rounded-xl bg-white p-1 shadow-sm border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTileType("street")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              tileType === "street"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Map View
          </button>
          <button
            type="button"
            onClick={() => setTileType("satellite")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              tileType === "satellite"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Satellite View
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-rose-50 p-3 text-center text-xs text-rose-700 font-bold border border-rose-200">
          {errorMessage}
        </div>
      )}

      <div className="relative w-full h-[75vh] rounded-2xl overflow-hidden shadow-sm border border-slate-200">
        {loading && (
          <div className="absolute inset-0 z-[1000] bg-white/80 backdrop-blur-sm flex items-center justify-center font-bold text-xs text-slate-600">
            Loading Barangay Tankulan geotagged map pins...
          </div>
        )}

        <MapContainer
          center={DEFAULT_CENTER}
          zoom={16}
          minZoom={15}
          maxZoom={19}
          maxBounds={TANKULAN_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ height: "100%", width: "100%" }}
        >
          {tileType === "street" ? (
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

          {activeReports.map((r) => (
            <CircleMarker
              key={r.id}
              center={[r.latitude!, r.longitude!]}
              radius={10}
              pathOptions={{
                color: "#ffffff",
                fillColor: r.status === "Ongoing" || r.status === "On-going" ? "#10b981" : "#f59e0b",
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup autoPan={true}>
                <div className="p-1 text-slate-800 w-52">
                  {r.image_urls && r.image_urls.length > 0 && (
                    <img
                      src={r.image_urls[0]}
                      alt={r.title}
                      className="mb-2 h-28 w-full rounded-lg object-cover"
                    />
                  )}
                  <h4 className="font-extrabold text-xs text-slate-900">{r.waste_type || r.title}</h4>
                  <p className="text-[11px] font-semibold text-emerald-800 mt-1">
                    {r.location_name || "Barangay Tankulan, Manolo Fortich"}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}