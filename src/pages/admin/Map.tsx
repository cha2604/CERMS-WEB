import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CircleMarker as LeafletCircleMarker } from "leaflet";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  ZoomControl,
} from "react-leaflet";
import {
  Filter,
  MapPin,
  ExternalLink,
  LocateFixed,
  ClipboardList,
  Clock3,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  CalendarDays,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import {
  getAreaBreakdown,
  type AreaWithCount,
} from "../../lib/ZoneQueries";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [
  8.360839,
  124.867628,
];

const TANKULAN_BOUNDS: [
  [number, number],
  [number, number]
] = [
  [8.35, 124.852],
  [8.372, 124.88],
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type SeverityLevel = "Low" | "Moderate" | "High";

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
  reporter_name?: string;
  severity: string | null;
}

type TileType = "street" | "satellite";

function isOngoing(status: string) {
  return (
    status.toLowerCase() === "ongoing" ||
    status.toLowerCase() === "on-going"
  );
}

function normalizeText(value: string) {
  return value.toUpperCase().replace(/\s+/g, " ").trim();
}

function isInsideTankulan(
  latitude: number,
  longitude: number
) {
  return (
    latitude >= TANKULAN_BOUNDS[0][0] &&
    latitude <= TANKULAN_BOUNDS[1][0] &&
    longitude >= TANKULAN_BOUNDS[0][1] &&
    longitude <= TANKULAN_BOUNDS[1][1]
  );
}

function normalizeSeverity(
  severity: string | null | undefined
): SeverityLevel {
  const value = (severity || "").trim().toLowerCase();

  if (value === "high") return "High";
  if (value === "moderate") return "Moderate";
  if (value === "low") return "Low";

  return "Moderate";
}

function getSeverityColor(severity: SeverityLevel) {
  switch (severity) {
    case "High":
      return "#ea580c";
    case "Moderate":
      return "#eab308";
    case "Low":
      return "#16a34a";
  }
}

function getSeverityBadge(severity: SeverityLevel) {
  switch (severity) {
    case "High":
      return "bg-orange-50 border-orange-200 text-orange-800";
    case "Moderate":
      return "bg-amber-50 border-amber-200 text-amber-800";
    case "Low":
      return "bg-emerald-50 border-emerald-200 text-emerald-800";
  }
}

function getStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case "ongoing":
    case "on-going":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "resolved":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function getMatchingArea(
  locationName: string | undefined,
  areas: AreaWithCount[]
) {
  if (!locationName) return undefined;

  const location = normalizeText(locationName);

  return areas.find((area) =>
    location.includes(normalizeText(area.name))
  );
}

export default function AdminMap() {
  const navigate = useNavigate();

  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [areas, setAreas] = useState<AreaWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [tileType, setTileType] = useState<TileType>("street");
  const [selectedReport, setSelectedReport] =
    useState<ReportRecord | null>(null);
  const [photoIndexes, setPhotoIndexes] = useState<Record<string, number>>({});
  const markerRefs = useRef<Record<string, LeafletCircleMarker | null>>({});
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState("All");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [reportResponse, areaResponse] = await Promise.all([
          supabase
            .from("reports")
            .select("*")
            .order("created_at", { ascending: false }),
          getAreaBreakdown(),
        ]);

        if (reportResponse.error) {
          throw reportResponse.error;
        }

        const fetchedReports =
          (reportResponse.data || []) as ReportRecord[];

        setReports(fetchedReports);
        setAreas(areaResponse);
      } catch (error) {
        console.error("Failed to load map data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const availableYears = useMemo(() => {
    const years = reports
      .map((report) => new Date(report.created_at).getFullYear())
      .filter((year) => Number.isFinite(year));

    return Array.from(
      new Set([...years, new Date().getFullYear()])
    ).sort((a, b) => b - a);
  }, [reports]);

  const tankulanReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          typeof report.latitude === "number" &&
          typeof report.longitude === "number" &&
          isInsideTankulan(
            report.latitude,
            report.longitude
          )
      ),
    [reports]
  );

  const filteredReports = useMemo(
    () =>
      tankulanReports.filter((report) => {
        if (statusFilter === "All") return true;

        if (statusFilter === "Ongoing") {
          return isOngoing(report.status);
        }

        return (
          report.status.toLowerCase() ===
          statusFilter.toLowerCase()
        );
      }),
    [tankulanReports, statusFilter]
  );

  const summary = useMemo(
    () => ({
      total: tankulanReports.length,
      pending: tankulanReports.filter(
        (report) => report.status.toLowerCase() === "pending"
      ).length,
      ongoing: tankulanReports.filter((report) =>
        isOngoing(report.status)
      ).length,
      resolved: tankulanReports.filter(
        (report) => report.status.toLowerCase() === "resolved"
      ).length,
    }),
    [tankulanReports]
  );

  const periodReports = useMemo(
    () =>
      tankulanReports.filter((report) => {
        const reportDate = new Date(report.created_at);

        if (!Number.isFinite(reportDate.getTime())) {
          return false;
        }

        if (reportDate.getFullYear() !== selectedYear) {
          return false;
        }

        if (
          selectedMonth !== "All" &&
          reportDate.getMonth() !== Number(selectedMonth)
        ) {
          return false;
        }

        return true;
      }),
    [tankulanReports, selectedYear, selectedMonth]
  );

  const chartAreas = useMemo(
    () =>
      areas
        .map((area) => {
          const matchingReports = periodReports.filter(
            (report) =>
              getMatchingArea(report.location_name, areas)?.id ===
              area.id
          );

          return {
            ...area,
            reportCount: matchingReports.length,
          };
        })
        .sort((a, b) => b.reportCount - a.reportCount),
    [areas, periodReports]
  );

  const maximumAreaCount = Math.max(
    ...chartAreas.map((area) => area.reportCount),
    1
  );

  const totalAreaConcerns = chartAreas.reduce(
    (total, area) => total + area.reportCount,
    0
  );

  const handleSelectArea = (area: AreaWithCount) => {
    const matchingReport = periodReports.find(
      (report) =>
        getMatchingArea(report.location_name, areas)?.id ===
        area.id
    );

    if (matchingReport) {
      setStatusFilter("All");
      setSelectedReport(matchingReport);
    }
  };

  useEffect(() => {
    if (!selectedReport) return;
    markerRefs.current[selectedReport.id]?.openPopup();
  }, [selectedReport]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 p-5 flex-col shrink-0 print:hidden">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-lg shadow-md">
            C
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base leading-none">
              CERMS
            </h2>
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mt-1">
              Waste Monitoring
            </p>
          </div>
        </div>

        <nav className="space-y-2 text-sm font-bold flex-1">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate("/map")}
            className="w-full text-left px-4 py-3 rounded-xl bg-emerald-800 text-white shadow-sm"
          >
            Geotagged Map
          </button>
          <button
            type="button"
            onClick={() => navigate("/reports")}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            Reports
          </button>
          <button
            type="button"
            onClick={() => navigate("/users")}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
            Accounts
          </button>
          <button
            type="button"
            onClick={() => navigate("/archive")}
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

      <main className="flex-1 min-w-0 p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-[1700px] mx-auto space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                  CERMS / Monitoring
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Geotagged Waste Concern Map
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Waste concern locations across Barangay Tankulan
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border border-slate-200 shadow-sm text-xs font-bold text-slate-700">
                <Filter size={15} className="text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="flex rounded-xl bg-white p-1 shadow-sm border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTileType("street")}
                  className={`px-3 py-2 rounded-lg transition-all ${
                    tileType === "street"
                      ? "bg-emerald-800 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Street
                </button>
                <button
                  type="button"
                  onClick={() => setTileType("satellite")}
                  className={`px-3 py-2 rounded-lg transition-all ${
                    tileType === "satellite"
                      ? "bg-emerald-800 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Satellite
                </button>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center">
                  <ClipboardList size={18} className="text-slate-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  All Concerns
                </span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-3">
                {summary.total}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Total submitted concerns
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock3 size={18} className="text-amber-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Pending
                </span>
              </div>
              <p className="text-2xl font-extrabold text-amber-600 mt-3">
                {summary.pending}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Awaiting action
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <AlertCircle size={18} className="text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Ongoing
                </span>
              </div>
              <p className="text-2xl font-extrabold text-emerald-600 mt-3">
                {summary.ongoing}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Currently being addressed
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <CheckCircle2 size={18} className="text-blue-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Resolved
                </span>
              </div>
              <p className="text-2xl font-extrabold text-blue-600 mt-3">
                {summary.resolved}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Completed concerns
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Waste Concern Location Map
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a marker to inspect its concern details
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <LocateFixed size={15} className="text-emerald-600" />
                  {filteredReports.length} mapped concerns
                </div>
              </div>

              <div className="relative h-[580px] sm:h-[680px] xl:h-[760px] overflow-hidden rounded-3xl border border-slate-200 shadow-lg bg-slate-200">
                <MapContainer
                  center={DEFAULT_CENTER}
                  zoom={16}
                  minZoom={15}
                  maxZoom={19}
                  maxBounds={TANKULAN_BOUNDS}
                  maxBoundsViscosity={1.0}
                  scrollWheelZoom
                  zoomControl={false}
                  preferCanvas
                  style={{
                    height: "100%",
                    width: "100%",
                    zIndex: 1,
                  }}
                >
                  {tileType === "street" ? (
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      maxZoom={19}
                    />
                  ) : (
                    <TileLayer
                      attribution="Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      maxZoom={19}
                    />
                  )}

                  <ZoomControl position="bottomright" />

                  {filteredReports.map((report) => {
                    const isSelected =
                      selectedReport?.id === report.id;

                    const severityLevel = normalizeSeverity(
                      report.severity
                    );

                    const markerColor = getSeverityColor(
                      severityLevel
                    );

                    const photos = Array.isArray(report.image_urls)
                      ? report.image_urls.filter((photo) => Boolean(photo?.trim()))
                      : [];

                    const photoIndex = photos.length
                      ? (photoIndexes[report.id] ?? 0) % photos.length
                      : 0;

                    return (
                      <CircleMarker
                        key={report.id}
                        ref={(marker) => {
                          markerRefs.current[report.id] = marker;
                        }}
                        center={[
                          report.latitude!,
                          report.longitude!,
                        ]}
                        radius={isSelected ? 15 : 11}
                        eventHandlers={{
                          click: () => setSelectedReport(report),
                        }}
                        pathOptions={{
                          color: isSelected ? "#0f172a" : "#ffffff",
                          fillColor: markerColor,
                          fillOpacity: 0.95,
                          weight: isSelected ? 4 : 2.5,
                        }}
                      >
                        <Popup autoPan maxWidth={360} minWidth={300}>
                          <div className="w-[300px] max-h-[440px] overflow-y-auto p-1 text-slate-800">
                            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                              <div className="min-w-0">
                                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">
                                  Waste Concern Details
                                </p>
                                <h3 className="mt-1 text-sm font-extrabold leading-snug text-slate-900">
                                  {report.waste_type || report.title || "Waste Concern"}
                                </h3>
                              </div>
                              <span
                                className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ${getStatusBadge(report.status)}`}
                              >
                                {report.status}
                              </span>
                            </div>

                            {photos.length > 0 ? (
                              <div className="mt-3">
                                <div className="h-40 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                  <img
                                    src={photos[photoIndex]}
                                    alt="Submitted waste concern"
                                    className="h-full w-full object-cover"
                                  />
                                </div>

                                {photos.length > 1 && (
                                  <div className="mt-2 flex items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        const currentIndex = photoIndexes[report.id] ?? 0;
                                        setPhotoIndexes((current) => ({
                                          ...current,
                                          [report.id]: (currentIndex - 1 + photos.length) % photos.length,
                                        }));
                                      }}
                                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                                    >
                                      Previous
                                    </button>

                                    <span className="text-[10px] font-semibold text-slate-500">
                                      {photoIndex + 1} of {photos.length} photos
                                    </span>

                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        const currentIndex = photoIndexes[report.id] ?? 0;
                                        setPhotoIndexes((current) => ({
                                          ...current,
                                          [report.id]: (currentIndex + 1) % photos.length,
                                        }));
                                      }}
                                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                                    >
                                      Next
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="mt-3 flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs font-medium text-slate-400">
                                No photos attached
                              </div>
                            )}

                            <div className="mt-3 space-y-1.5">
                              <p className="flex items-start gap-2 text-[11px] font-semibold text-slate-600">
                                <MapPin size={13} className="mt-0.5 shrink-0 text-emerald-700" />
                                <span>
                                  {report.location_name || "Barangay Tankulan, Manolo Fortich"}
                                </span>
                              </p>
                              <p className="pl-5 text-[10px] text-slate-400">
                                {report.latitude}, {report.longitude}
                              </p>
                            </div>

                            <div className="mt-3">
                              <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                                Concern Description
                              </p>
                              <p className="mt-1 max-h-20 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-700">
                                {report.description || "No description provided."}
                              </p>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                                  Severity Level
                                </p>
                                <span
                                  className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[10px] font-extrabold ${getSeverityBadge(severityLevel)}`}
                                >
                                  {severityLevel}
                                </span>
                              </div>

                              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                                  Reported Date
                                </p>
                                <p className="mt-1 text-[11px] font-extrabold text-slate-800">
                                  {new Date(report.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/report/${report.id}`);
                              }}
                              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-[10px] font-extrabold text-white transition-colors hover:bg-slate-800"
                            >
                              FULL REPORT DETAILS
                              <ExternalLink size={12} />
                            </button>
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>

                <div className="absolute left-4 top-4 z-[500] rounded-2xl border border-white/70 bg-white/95 backdrop-blur-md p-3 shadow-lg">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                    Severity Legend
                  </p>
                  <div className="space-y-2">
                    {[
                      { name: "High", color: "#ea580c" },
                      { name: "Moderate", color: "#eab308" },
                      { name: "Low", color: "#16a34a" },
                    ].map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-2"
                      >
                        <span
                          className="h-3 w-3 rounded-full border-2 border-white shadow-sm"
                          style={{
                            backgroundColor: item.color,
                          }}
                        />
                        <span className="text-[11px] font-bold text-slate-700">
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 z-[500] rounded-xl bg-white/95 backdrop-blur-md border border-white/70 px-3 py-2 shadow-lg">
                  <p className="text-[10px] font-bold text-slate-600">
                    Barangay Tankulan, Manolo Fortich
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Geotagged waste concern locations
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
                {[
                  { name: "Pending", color: "bg-amber-500" },
                  { name: "Ongoing", color: "bg-emerald-600" },
                  { name: "Resolved", color: "bg-blue-600" },
                  { name: "Rejected", color: "bg-rose-600" },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${item.color}`}
                    />
                    <span className="text-[10px] font-semibold text-slate-500">
                      {item.name}
                    </span>
                  </div>
                ))}
                <p className="text-[10px] text-slate-400">
                  Marker colors represent severity.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-rose-50 flex items-center justify-center">
                    <BarChart3 size={19} className="text-rose-700" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Waste Concerns by Community Area
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Compare the number of reported concerns across
                      Tankulan's community areas
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <CalendarDays
                    size={14}
                    className="text-slate-400"
                  />
                  <select
                    value={selectedYear}
                    onChange={(event) =>
                      setSelectedYear(Number(event.target.value))
                    }
                    className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <Filter size={14} className="text-slate-400" />
                  <select
                    value={selectedMonth}
                    onChange={(event) =>
                      setSelectedMonth(event.target.value)
                    }
                    className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="All">All Months</option>
                    {MONTHS.map((month, index) => (
                      <option key={month} value={index.toString()}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-100 py-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {selectedMonth === "All"
                    ? `Yearly Overview · ${selectedYear}`
                    : `${MONTHS[Number(selectedMonth)]} ${selectedYear}`}
                </p>
                <p className="text-sm font-extrabold text-slate-900 mt-1">
                  {totalAreaConcerns.toLocaleString()}{" "}
                  {totalAreaConcerns === 1 ? "Concern" : "Concerns"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Top Community Area
                </p>
                <p className="text-sm font-extrabold text-rose-700 mt-1">
                  {chartAreas.length > 0 &&
                  chartAreas[0].reportCount > 0
                    ? chartAreas[0].name
                    : "No recorded concerns"}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4 py-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-7 animate-pulse rounded-lg bg-slate-100"
                  />
                ))}
              </div>
            ) : chartAreas.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Community Area
                  </p>
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Number of Concerns
                  </p>
                </div>

                <div className="space-y-4">
                  {chartAreas.map((area, index) => {
                    const barWidth =
                      area.reportCount === 0
                        ? 0
                        : (area.reportCount / maximumAreaCount) * 100;

                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => handleSelectArea(area)}
                        disabled={area.reportCount === 0}
                        className="w-full grid grid-cols-[115px_minmax(0,1fr)_35px] sm:grid-cols-[155px_minmax(0,1fr)_45px] gap-3 items-center text-left group disabled:cursor-default"
                        title={`${area.name}: ${area.reportCount} concerns`}
                      >
                        <span
                          className={`text-[10px] sm:text-xs font-bold truncate ${
                            index === 0
                              ? "text-slate-900"
                              : "text-slate-600"
                          } group-hover:text-rose-700 transition-colors`}
                        >
                          {area.name}
                        </span>

                        <div
                          className="h-6 sm:h-7 w-full rounded-sm overflow-hidden relative"
                          style={{
                            backgroundColor: "#f1f5f9",
                            backgroundImage:
                              "linear-gradient(to right, #dbe2ea 1px, transparent 1px)",
                            backgroundSize: "20% 100%",
                          }}
                        >
                          <div
                            className="h-full rounded-r-sm transition-all duration-500 ease-out"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: "#b8322a",
                              minWidth:
                                area.reportCount > 0 ? "3px" : "0",
                            }}
                          />
                        </div>

                        <span
                          className={`text-xs font-extrabold text-right tabular-nums ${
                            index === 0
                              ? "text-rose-700"
                              : "text-slate-700"
                          }`}
                        >
                          {area.reportCount}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                  <span>Highest to lowest</span>
                  <span>
                    {chartAreas.length} community areas included
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center">
                <BarChart3
                  size={26}
                  className="mx-auto text-slate-300 mb-2"
                />
                <p className="text-xs font-semibold text-slate-400">
                  No community-area data available.
                </p>
              </div>
            )}

            {totalAreaConcerns === 0 && !loading && (
              <p className="text-center text-xs text-slate-400 py-2">
                No concerns were recorded in the selected period.
              </p>
            )}
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 pb-2">
            <p className="text-[10px] text-slate-400">
              CERMS — Community-Based Waste Reporting and Monitoring
            </p>
            <p className="text-[10px] text-slate-400">
              Barangay Tankulan, Manolo Fortich, Bukidnon
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}