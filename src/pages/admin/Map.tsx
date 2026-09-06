import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { supabase } from "../../lib/supabase";
import { getZoneBreakdown, type ZoneWithCount } from "../../lib/ZoneQueries";
import "leaflet/dist/leaflet.css";
import {
  Filter,
  Layers,
  MapPin,
  ExternalLink
} from "lucide-react";

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
  status: "Pending" | "Ongoing" | "On-going" | "Resolved" | "Rejected";
  created_at: string;
  reporter_name?: string;
  severity_level?: string;
}

export default function AdminMap() {
  const navigate = useNavigate();

  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [zones, setZones] = useState<ZoneWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [tileType, setTileType] = useState<"street" | "satellite">("street");
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [reportData, zoneData] = await Promise.all([
          supabase.from("reports").select("*").order("created_at", { ascending: false }),
          getZoneBreakdown(),
        ]);

        if (reportData.data) {
          const fetchedReports = reportData.data as ReportRecord[];
          setReports(fetchedReports);
          if (fetchedReports.length > 0) {
            setSelectedReport(fetchedReports[0]);
          }
        }
        setZones(zoneData);
      } catch (err) {
        console.error("Failed to load map data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredReports = reports.filter((r) => {
    if (typeof r.latitude !== "number" || typeof r.longitude !== "number") return false;
    if (statusFilter === "All") return true;
    return r.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const handleUpdateStatus = async (newStatus: "Ongoing" | "Resolved" | "Rejected") => {
    if (!selectedReport) return;

    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: newStatus })
        .eq("id", selectedReport.id);

      if (error) throw error;

      const updated = { ...selectedReport, status: newStatus };
      setSelectedReport(updated);
      setReports((prev) =>
        prev.map((r) => (r.id === selectedReport.id ? updated : r))
      );
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update report status.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Geotagged Incident Map</h1>
          <p className="text-xs text-slate-500">Barangay Tankulan Waste Incident Overview & Management</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs text-xs font-bold text-slate-700">
            <Filter size={14} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <div className="flex rounded-xl bg-white p-1 shadow-xs border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setTileType("street")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tileType === "street"
                  ? "bg-emerald-800 text-white shadow-xs"
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
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Satellite View
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 h-[680px] overflow-hidden rounded-3xl border border-slate-200 shadow-xs relative">
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

            {filteredReports.map((r) => (
              <CircleMarker
                key={r.id}
                center={[r.latitude!, r.longitude!]}
                radius={12}
                eventHandlers={{
                  click: () => setSelectedReport(r)
                }}
                pathOptions={{
                  color: selectedReport?.id === r.id ? "#0f172a" : "#ffffff",
                  fillColor:
                    r.status === "Ongoing" || r.status === "On-going"
                      ? "#10b981"
                      : r.status === "Resolved"
                      ? "#3b82f6"
                      : "#f59e0b",
                  fillOpacity: 0.9,
                  weight: selectedReport?.id === r.id ? 3 : 2,
                }}
              >
                <Popup autoPan={true}>
                  <div className="p-1 text-slate-800 w-48">
                    <p className="font-bold text-xs text-slate-900">{r.waste_type || r.title}</p>
                    <p className="text-[11px] font-semibold text-emerald-800 mt-0.5">
                      {r.location_name || "Barangay Tankulan"}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between font-sans">
          {selectedReport ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Report Inspection
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    selectedReport.status === "Resolved"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : selectedReport.status === "Ongoing" || selectedReport.status === "On-going"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {selectedReport.status}
                </span>
              </div>

              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {selectedReport.waste_type || selectedReport.title}
                </h2>
                <div className="flex items-center gap-1 text-xs font-medium text-slate-500 mt-1">
                  <MapPin size={13} className="text-emerald-700" />
                  {selectedReport.location_name || "Barangay Tankulan, Manolo Fortich"}
                </div>
              </div>

              {selectedReport.image_urls && selectedReport.image_urls.length > 0 ? (
                <div className="h-44 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                  <img
                    src={selectedReport.image_urls[0]}
                    alt="Incident location"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-28 rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400 font-medium">
                  No photos attached
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800">Incident Description</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 leading-relaxed max-h-24 overflow-y-auto">
                  {selectedReport.description || "No description provided."}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 block">Severity</span>
                  <span className="font-extrabold text-slate-800">
                    {selectedReport.severity_level || "Moderate"}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 block">Reported Date</span>
                  <span className="font-extrabold text-slate-800">
                    {new Date(selectedReport.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <label className="text-xs font-bold text-slate-800">Update Incident Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleUpdateStatus("Ongoing")}
                    className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                  >
                    Dispatch
                  </button>
                  <button
                    onClick={() => handleUpdateStatus("Resolved")}
                    className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => handleUpdateStatus("Rejected")}
                    className="py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <Layers size={32} />
              <p className="text-xs font-semibold">Select a pin on the map to view detailed incident management controls.</p>
            </div>
          )}

          {selectedReport && (
            <button
              onClick={() => navigate(`/admin/report/${selectedReport.id}`)}
              className="mt-4 w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              FULL REPORT DETAILS <ExternalLink size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Reports Breakdown by Purok</h2>
          <p className="text-xs text-slate-500">Official Puroks of Barangay Tankulan</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 p-3.5 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span className="text-xs font-bold text-slate-800">
                    {zone.name}
                  </span>
                </div>
                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {zone.reportCount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}