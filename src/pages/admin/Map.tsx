import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { supabase } from "../../lib/supabase";
import "leaflet/dist/leaflet.css";

const TANKULAN_CENTER: [number, number] = [8.361106, 124.8647778];
const TANKULAN_STRICT_BOUNDS: [[number, number], [number, number]] = [
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
  status: "Pending" | "Ongoing" | "Resolved" | "Rejected";
  created_at: string;
  reporter_name?: string;
}

export default function AdminMap() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tileType, setTileType] = useState<"street" | "satellite">("street");

  useEffect(() => {
    async function fetchActiveMapReports() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          const { data: fallbackData } = await supabase
            .from("reports")
            .select("*")
            .order("created_at", { ascending: false });
          if (fallbackData) setReports(fallbackData as ReportRecord[]);
        } else if (data) {
          setReports(data as ReportRecord[]);
        }
      } catch (err) {
        console.error("Failed to fetch map reports:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchActiveMapReports();
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
    <div className="relative w-full h-[calc(100vh-3rem)] overflow-hidden rounded-2xl">
      <div className="absolute left-16 top-3 z-[1000] bg-white/95 px-4 py-2 rounded-xl shadow-lg border border-slate-200 backdrop-blur-md">
        <h3 className="font-extrabold text-slate-900 text-sm leading-none">Barangay Tankulan Geotagged Map</h3>
        <p className="text-[11px] font-bold text-emerald-800 mt-1">
          {loading ? "Loading active pins..." : `${activeReports.length} Unresolved Active Concern Pins`}
        </p>
      </div>

      <div className="absolute right-4 top-3 z-[1000] flex rounded-xl bg-white/95 p-1 shadow-lg border border-slate-200 text-xs font-bold backdrop-blur-md">
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

      <MapContainer
        center={TANKULAN_CENTER}
        zoom={17}
        minZoom={16}
        maxZoom={19}
        maxBounds={TANKULAN_STRICT_BOUNDS}
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
            radius={12}
            pathOptions={{
              color: "#ffffff",
              fillColor: r.status === "Ongoing" ? "#10b981" : "#f59e0b",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup autoPan={true}>
              <div className="p-1 text-slate-800 w-60">
                {r.image_urls && r.image_urls.length > 0 && (
                  <div className="relative mb-2 h-36 w-full overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                    <img
                      src={r.image_urls[0]}
                      alt={r.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <span className="text-[10px] font-mono font-bold text-emerald-800 block">
                  #{r.id.slice(0, 8)}
                </span>
                <h4 className="font-extrabold text-sm text-slate-900">{r.waste_type || r.title}</h4>
                <p className="text-xs font-bold text-emerald-800 mt-1 leading-snug">
                  {r.location_name || "Barangay Tankulan, Manolo Fortich"}
                </p>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  {r.status}
                </span>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}