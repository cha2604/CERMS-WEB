import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiInfo,
  FiMapPin,
  FiPrinter,
  FiRefreshCw,
  FiUsers,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import exifr from "exifr";
import { supabase } from "../../lib/supabase";
import "leaflet/dist/leaflet.css";

interface ProfileData {
  full_name?: string | null;
  contact_number?: string | null;
  email?: string | null;
  address?: string | null;
}

interface ReportDetail {
  id: string;
  title: string | null;
  waste_type: string | null;
  category: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  image_urls: string[] | null;
  status:
    | "Pending"
    | "Ongoing"
    | "On-going"
    | "Resolved"
    | "Rejected"
    | "Draft";
  severity: string | null;
  rejection_reason: string | null;
  remarks: string | null;
  created_at: string;
  updated_at?: string | null;
  user_id: string;
  profiles?: ProfileData | null;
}

interface Assignment {
  id: string;
  report_id: string;
  team_name: string;
  personnel_name: string;
  notes: string | null;
  assigned_by: string | null;
  assigned_at: string;
}

interface StatusHistory {
  id: string;
  report_id: string;
  status: string;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
}

interface ExifData {
  dateTaken: string | null;
  device: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
}

const BARANGAY_RESPONSE_TEAMS = [
  {
    name: "Barangay Sanitary Inspection",
    personnel: ["Jeanilie S. Javier"],
  },
  {
    name: "Solid Waste Management",
    personnel: ["Dominador L. Domo"],
  },
  {
    name: "Barangay Garbage Crew",
    personnel: [
      "Richard E. Dela Cruz (Driver)",
      "Marlon Malilong",
      "Rogelio Margallo",
    ],
  },
] as const;

const STATUS_OPTIONS = [
  {
    value: "Pending",
    label: "Pending",
    helper: "Waiting for initial review",
  },
  {
    value: "Ongoing",
    label: "Ongoing",
    helper: "Response team is handling the concern",
  },
  {
    value: "Resolved",
    label: "Resolved",
    helper: "Cleanup or corrective action has been completed",
  },
  {
    value: "Rejected",
    label: "Rejected",
    helper: "Invalid, duplicate, or unsupported report",
  },
] as const;

function normalizeStatus(status: string) {
  return status === "On-going" ? "Ongoing" : status;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatFileName(url: string, index: number) {
  try {
    const parsed = new URL(url);
    const name = parsed.pathname.split("/").pop();
    return name || `Photo ${index + 1}`;
  } catch {
    return `Photo ${index + 1}`;
  }
}

function getStatusBadgeClass(status: string) {
  switch (normalizeStatus(status)) {
    case "Pending":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "Ongoing":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "Resolved":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "Rejected":
      return "bg-rose-50 text-rose-800 border-rose-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function getSeverityClass(severity?: string | null) {
  switch ((severity || "").toLowerCase()) {
    case "high":
      return "bg-orange-50 text-orange-800 border-orange-200";
    case "moderate":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "low":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const earthRadius = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

async function extractExifFromUrl(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    const fileName = url.split("/").pop() || "photo.jpg";
    const file = new File([blob], fileName, {
      type: blob.type || "image/jpeg",
    });

    const data = await exifr.parse(file, {
      gps: true,
      pick: [
        "DateTimeOriginal",
        "Make",
        "Model",
        "GPSLatitude",
        "GPSLongitude",
        "GPSAltitude",
        "ExifImageWidth",
        "ExifImageHeight",
        "PixelXDimension",
        "PixelYDimension",
      ],
    });

    if (!data) return null;

    const device =
      [data.Make, data.Model].filter(Boolean).join(" ") || null;

    return {
      dateTaken: data.DateTimeOriginal
        ? new Date(data.DateTimeOriginal).toISOString()
        : null,
      device,
      latitude:
        typeof data.latitude === "number" ? data.latitude : null,
      longitude:
        typeof data.longitude === "number" ? data.longitude : null,
      altitude:
        typeof data.GPSAltitude === "number"
          ? data.GPSAltitude
          : null,
      imageWidth:
        data.ExifImageWidth ?? data.PixelXDimension ?? null,
      imageHeight:
        data.ExifImageHeight ?? data.PixelYDimension ?? null,
    } as ExifData;
  } catch {
    return null;
  }
}

export default function AdminReportDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [assignment, setAssignment] =
    useState<Assignment | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusInput, setStatusInput] = useState("Pending");
  const [rejectionReason, setRejectionReason] = useState("");
  const [remarksInput, setRemarksInput] = useState("");
  const [teamName, setTeamName] = useState("");
  const [personnelNames, setPersonnelNames] = useState<string[]>([]);
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [exifByImage, setExifByImage] = useState<
    Record<number, ExifData | null>
  >({});

  const loadHistory = async (reportId: string) => {
    const { data, error } = await supabase
      .from("report_status_history")
      .select("id, report_id, status, note, changed_by, changed_at")
      .eq("report_id", reportId)
      .order("changed_at", { ascending: true });

    if (!error) {
      setHistory((data || []) as StatusHistory[]);
    }
  };

  const loadAssignment = async (reportId: string) => {
    const { data, error } = await supabase
      .from("report_assignments")
      .select(
        "id, report_id, team_name, personnel_name, notes, assigned_by, assigned_at"
      )
      .eq("report_id", reportId)
      .maybeSingle();

    if (!error && data) {
      const currentAssignment = data as Assignment;
      setAssignment(currentAssignment);
      setTeamName(currentAssignment.team_name || "");
      setPersonnelNames(
        currentAssignment.personnel_name
          ? currentAssignment.personnel_name.split(", ").filter(Boolean)
          : []
      );
      setAssignmentNotes(currentAssignment.notes || "");
    }
  };

  useEffect(() => {
    async function fetchReportDetails() {
      if (!id) return;

      try {
        setLoading(true);
        setErrorMessage("");

        const { data, error } = await supabase
          .from("reports")
          .select(
            "*, profiles(full_name, contact_number, email, address)"
          )
          .eq("id", id)
          .single();

        if (error) {
          throw error;
        }

        const loadedReport = data as ReportDetail;
        setReport(loadedReport);
        setStatusInput(normalizeStatus(loadedReport.status));
        setRejectionReason(loadedReport.rejection_reason || "");
        setRemarksInput(loadedReport.remarks || "");

        await Promise.all([
          loadAssignment(id),
          loadHistory(id),
        ]);
      } catch (error) {
        console.error("Failed to load report details:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load report details."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchReportDetails();
  }, [id]);

  useEffect(() => {
    const urls = report?.image_urls || [];
    if (urls.length === 0) return;

    let cancelled = false;

    async function loadExif() {
      const results = await Promise.all(
        urls.slice(0, 5).map(async (url, index) => {
          const exif = await extractExifFromUrl(url);
          return [index, exif] as const;
        })
      );

      if (cancelled) return;

      const next: Record<number, ExifData | null> = {};
      for (const [index, exif] of results) {
        next[index] = exif;
      }
      setExifByImage(next);
    }

    loadExif();

    return () => {
      cancelled = true;
    };
  }, [report?.image_urls]);

  const images = report?.image_urls || [];
  const mainImage = images[selectedImageIndex] || null;
  const selectedExif = exifByImage[selectedImageIndex] || null;

  const timeline = useMemo(() => {
    const submittedEvent: StatusHistory = {
      id: `submitted-${report?.id || "report"}`,
      report_id: report?.id || "",
      status: "Submitted",
      note: "Report submitted by resident",
      changed_by: report?.user_id || null,
      changed_at: report?.created_at || new Date().toISOString(),
    };

    return [
      submittedEvent,
      ...history,
    ];
  }, [history, report]);

  const exifDifference = useMemo(() => {
    if (
      report?.latitude === null ||
      report?.longitude === null ||
      report?.latitude === undefined ||
      report?.longitude === undefined ||
      selectedExif?.latitude === null ||
      selectedExif?.longitude === null ||
      selectedExif?.latitude === undefined ||
      selectedExif?.longitude === undefined
    ) {
      return null;
    }

    return calculateDistanceMeters(
      report.latitude,
      report.longitude,
      selectedExif.latitude,
      selectedExif.longitude
    );
  }, [report, selectedExif]);

  const handleAssignTeam = async () => {
    if (!id) return;

    if (!teamName.trim() || personnelNames.length === 0) {
      setErrorMessage(
        "Please select the assigned team and at least one barangay personnel."
      );
      return;
    }

    try {
      setAssignmentLoading(true);
      setErrorMessage("");
      setSaveSuccess("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Your admin session could not be verified.");
      }

      const payload = {
        report_id: id,
        team_name: teamName.trim(),
        personnel_name: personnelNames.join(", "),
        notes: assignmentNotes.trim() || null,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("report_assignments")
        .upsert(payload, { onConflict: "report_id" })
        .select()
        .single();

      if (error) throw error;

      const { error: historyError } = await supabase
        .from("report_status_history")
        .insert({
          report_id: id,
          status: normalizeStatus(report?.status || statusInput),
          note: `Assigned to ${teamName.trim()} - ${personnelNames.join(", ")}`,
          changed_by: user.id,
        });

      if (historyError) throw historyError;

      setAssignment(data as Assignment);
      await loadHistory(id);
      setSaveSuccess("Response team assigned successfully.");
    } catch (error) {
      console.error("Failed to assign response team:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to assign response team."
      );
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!id || !report) return;

    try {
      setSaving(true);
      setSaveSuccess("");
      setErrorMessage("");

      if (statusInput === "Rejected" && !rejectionReason.trim()) {
        throw new Error("Please provide a reason for rejection.");
      }

      const previousStatus = normalizeStatus(report.status);
      const nextStatus = normalizeStatus(statusInput);

      const updateData: Record<string, unknown> = {
        status: nextStatus,
        remarks: remarksInput.trim() || null,
        rejection_reason:
          nextStatus === "Rejected"
            ? rejectionReason.trim()
            : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("reports")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Your admin session could not be verified.");
      }

      if (previousStatus !== nextStatus) {
        const { error: historyError } = await supabase
          .from("report_status_history")
          .insert({
            report_id: id,
            status: nextStatus,
            note:
              nextStatus === "Rejected"
                ? rejectionReason.trim()
                : remarksInput.trim() || null,
            changed_by: user.id,
          });

        if (historyError) throw historyError;
      }

      const nextReport: ReportDetail = {
        ...report,
        status: nextStatus as ReportDetail["status"],
        remarks: remarksInput.trim() || null,
        rejection_reason:
          nextStatus === "Rejected"
            ? rejectionReason.trim()
            : null,
        updated_at: new Date().toISOString(),
      };

      setReport(nextReport);
      await loadHistory(id);
      setSaveSuccess("Report details updated successfully.");
    } catch (error) {
      console.error("Failed to update report:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to update report."
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const reporterName =
    report?.profiles?.full_name || "Unknown Resident";

  const reporterContact =
    report?.profiles?.contact_number || "Not provided";

  const reporterEmail =
    report?.profiles?.email || "Not provided";

  const reporterAddress =
    report?.profiles?.address || "Not provided";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
          <FiRefreshCw className="animate-spin" />
          Loading report details...
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
          <FiXCircle size={24} />
        </div>
        <h2 className="text-xl font-black text-slate-800">
          Report Not Found
        </h2>
        <button
          type="button"
          onClick={() => navigate("/reports")}
          className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl"
        >
          Back to Reports
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans print:bg-white">
      <div className="print:hidden border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/reports")}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <FiArrowLeft size={14} />
              Back to Reports
            </button>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                CERMS Waste Case
              </p>
              <p className="font-mono text-[11px] font-bold text-slate-500">
                #{report.id.slice(0, 8)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3.5 py-2 rounded-xl text-xs font-black border ${getStatusBadgeClass(
                report.status
              )}`}
            >
              {normalizeStatus(report.status)}
            </span>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black rounded-xl shadow-sm"
            >
              <FiPrinter size={14} />
              Print Report
            </button>
          </div>
        </div>
      </div>

      <main id="print-area" className="max-w-[1500px] mx-auto p-6 lg:p-8 print:p-0 print:max-w-none">
        <div className="hidden print:block text-center border-b-2 border-emerald-800 pb-4 mb-6">
          <p className="text-xs font-black tracking-[0.18em] text-slate-500">
            REPUBLIC OF THE PHILIPPINES
          </p>
          <h1 className="text-2xl font-black text-emerald-900 mt-1">
            BARANGAY TANKULAN
          </h1>
          <p className="text-sm font-bold text-slate-700">
            WASTE INCIDENT REPORT
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            CERMS Official Report
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 print:hidden">
            {errorMessage}
          </div>
        )}

        {saveSuccess && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 print:hidden">
            {saveSuccess}
          </div>
        )}

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] gap-6">
          <div className="space-y-6">
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:rounded-none">
              <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                    Waste Concern
                  </p>
                  <h2 className="text-2xl font-black text-slate-900 mt-1">
                    {report.waste_type ||
                      report.title ||
                      "Waste Concern Report"}
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 mt-2">
                    Submitted {formatDateTime(report.created_at)}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex px-3 py-1.5 rounded-full text-[11px] font-black border ${getStatusBadgeClass(
                      report.status
                    )}`}
                  >
                    {normalizeStatus(report.status)}
                  </span>
                  <div className="mt-2">
                    <span
                      className={`inline-flex px-3 py-1.5 rounded-full text-[11px] font-black border ${getSeverityClass(
                        report.severity
                      )}`}
                    >
                      Severity: {report.severity || "Not assessed"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Report Description
                  </p>
                  <div className="mt-2 rounded-2xl bg-slate-50 border border-slate-200 p-4 min-h-[145px] text-sm font-medium leading-6 text-slate-700">
                    {report.description ||
                      "No description was provided by the resident."}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Report Address
                    </p>
                    <p className="mt-2 text-sm font-extrabold leading-6 text-slate-900">
                      {report.location_name ||
                        "Location address unavailable"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Latitude
                      </p>
                      <p className="mt-1 font-mono text-xs font-black text-slate-800">
                        {report.latitude !== null
                          ? report.latitude.toFixed(6)
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Longitude
                      </p>
                      <p className="mt-1 font-mono text-xs font-black text-slate-800">
                        {report.longitude !== null
                          ? report.longitude.toFixed(6)
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:rounded-none">
              <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-600">
                    Geotagged Report Location
                  </p>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Map Pinpoint
                  </h3>
                </div>
                <FiMapPin className="text-red-600" size={21} />
              </div>

              <div className="p-6">
                {typeof report.latitude === "number" &&
                typeof report.longitude === "number" ? (
                  <div className="h-[380px] w-full overflow-hidden rounded-2xl border border-slate-200 print:hidden">
                    <MapContainer
                      center={[report.latitude, report.longitude]}
                      zoom={17}
                      scrollWheelZoom={false}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <CircleMarker
                        center={[report.latitude, report.longitude]}
                        radius={12}
                        pathOptions={{
                          color: "#ffffff",
                          fillColor: "#dc2626",
                          fillOpacity: 1,
                          weight: 3,
                        }}
                      >
                        <Popup autoPan={true}>
                          <div className="p-1 w-56">
                            <p className="text-[10px] font-black uppercase tracking-wider text-red-600">
                              Waste Report Location
                            </p>
                            <p className="mt-1 text-xs font-extrabold text-slate-900">
                              {report.location_name ||
                                "Barangay Tankulan, Manolo Fortich, Bukidnon"}
                            </p>
                          </div>
                        </Popup>
                      </CircleMarker>
                    </MapContainer>
                  </div>
                ) : (
                  <div className="h-[380px] w-full rounded-2xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 print:hidden">
                    No coordinates are available for this report.
                  </div>
                )}

                <div className="hidden print:block border border-slate-300 rounded-xl p-4 mt-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-red-700">
                    Report Location
                  </p>
                  <p className="mt-2 text-sm font-extrabold text-slate-900">
                    {report.location_name || "Location unavailable"}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-600">
                    {report.latitude !== null
                      ? report.latitude.toFixed(6)
                      : "—"}{" "}
                    ,{" "}
                    {report.longitude !== null
                      ? report.longitude.toFixed(6)
                      : "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:rounded-none">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                    Evidence
                  </p>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Submitted Photos
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  {images.length} photo{images.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="p-6">
                {images.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-5">
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedImage(mainImage)}
                        className="block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 print:hidden"
                      >
                        {mainImage && (
                          <img
                            src={mainImage}
                            alt="Waste evidence"
                            className="w-full h-[360px] object-contain bg-slate-900"
                          />
                        )}
                      </button>

                      <div className="hidden print:block">
                        {mainImage && (
                          <img
                            src={mainImage}
                            alt="Waste evidence"
                            className="w-full max-h-[420px] object-contain rounded-xl border border-slate-200"
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-5 gap-2 mt-3">
                        {images.slice(0, 5).map((url, index) => (
                          <button
                            key={`${url}-${index}`}
                            type="button"
                            onClick={() => setSelectedImageIndex(index)}
                            className={`h-16 rounded-xl overflow-hidden border-2 transition-all print:hidden ${
                              index === selectedImageIndex
                                ? "border-emerald-700"
                                : "border-slate-200 hover:border-emerald-300"
                            }`}
                          >
                            <img
                              src={url}
                              alt={`Evidence ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Selected Photo
                        </p>
                        <p className="mt-1 text-xs font-extrabold text-slate-900 break-all">
                          {formatFileName(
                            mainImage || "",
                            selectedImageIndex
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-400">
                            Date Taken
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-slate-800">
                            {selectedExif?.dateTaken
                              ? formatDateTime(selectedExif.dateTaken)
                              : "Not available"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-400">
                            Device
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-slate-800">
                            {selectedExif?.device || "Not available"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-400">
                            Dimensions
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-slate-800">
                            {selectedExif?.imageWidth && selectedExif?.imageHeight
                              ? `${selectedExif.imageWidth} × ${selectedExif.imageHeight}`
                              : "Not available"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-400">
                            Altitude
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-slate-800">
                            {selectedExif?.altitude !== null &&
                            selectedExif?.altitude !== undefined
                              ? `${selectedExif.altitude.toFixed(1)} m`
                              : "Not available"}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-4">
                        <p className="text-[9px] font-black uppercase text-slate-400">
                          Photo GPS
                        </p>
                        <p className="mt-1 font-mono text-[11px] font-bold text-slate-800">
                          {selectedExif?.latitude !== null &&
                          selectedExif?.latitude !== undefined &&
                          selectedExif?.longitude !== null &&
                          selectedExif?.longitude !== undefined
                            ? `${selectedExif.latitude.toFixed(6)}, ${selectedExif.longitude.toFixed(6)}`
                            : "No EXIF GPS data"}
                        </p>
                      </div>

                      {exifDifference !== null && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                          <p className="text-[9px] font-black uppercase text-blue-700">
                            Photo GPS vs Report Pin
                          </p>
                          <p className="mt-1 text-xs font-black text-blue-900">
                            {exifDifference < 1000
                              ? `${Math.round(exifDifference)} meters apart`
                              : `${(exifDifference / 1000).toFixed(2)} km apart`}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <FiInfo size={13} />
                        EXIF availability depends on the uploaded image retaining its metadata.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs font-semibold text-slate-400">
                    No evidence photos were uploaded.
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:rounded-none">
              <div className="px-6 py-5 border-b border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Reporter
                </p>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Resident Information
                </h3>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-[9px] font-black uppercase text-slate-400">
                      Full Name
                    </p>
                    <p className="mt-1 font-extrabold text-slate-900">
                      {reporterName}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-[9px] font-black uppercase text-slate-400">
                      Contact
                    </p>
                    <p className="mt-1 font-extrabold text-slate-900">
                      {reporterContact}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">
                    Email
                  </p>
                  <p className="mt-1 font-extrabold text-slate-900 break-all">
                    {reporterEmail}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">
                    Address
                  </p>
                  <p className="mt-1 font-extrabold leading-5 text-slate-900">
                    {reporterAddress}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">
                      Submitted
                    </p>
                    <p className="mt-1 font-bold text-slate-800">
                      {formatDate(report.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">
                      Report ID
                    </p>
                    <p className="mt-1 font-mono font-bold text-slate-800">
                      {report.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:rounded-none">
              <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
                    Response Assignment
                  </p>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Assign Team
                  </h3>
                </div>
                <FiUsers className="text-blue-700" size={20} />
              </div>

              <div className="p-6 space-y-4 print:hidden">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Assigned Team
                  </label>
                  <select
                    value={teamName}
                    onChange={(event) => {
                      const nextTeam = event.target.value;
                      setTeamName(nextTeam);
                      const selectedTeam = BARANGAY_RESPONSE_TEAMS.find(
                        (team) => team.name === nextTeam
                      );
                      setPersonnelNames(
                        selectedTeam ? [...selectedTeam.personnel] : []
                      );
                    }}
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-700/20"
                  >
                    <option value="">Select response team</option>
                    {BARANGAY_RESPONSE_TEAMS.map((team) => (
                      <option key={team.name} value={team.name}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Assigned Personnel
                  </label>
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    {teamName ? (
                      BARANGAY_RESPONSE_TEAMS
                        .find((team) => team.name === teamName)
                        ?.personnel.map((person) => (
                          <label
                            key={person}
                            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 border border-slate-200 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={personnelNames.includes(person)}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setPersonnelNames((current) =>
                                    current.includes(person)
                                      ? current
                                      : [...current, person]
                                  );
                                } else {
                                  setPersonnelNames((current) =>
                                    current.filter((name) => name !== person)
                                  );
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
                            />
                            <span className="text-xs font-semibold text-slate-800">
                              {person}
                            </span>
                          </label>
                        ))
                    ) : (
                      <p className="text-xs font-semibold text-slate-500">
                        Select a response team to choose the assigned personnel.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Assignment Notes
                  </label>
                  <textarea
                    rows={3}
                    value={assignmentNotes}
                    onChange={(event) => setAssignmentNotes(event.target.value)}
                    placeholder="Enter dispatch or assignment instructions"
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-700/20"
                  />
                </div>

                {assignment && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs">
                    <p className="font-black text-blue-900">
                      Currently Assigned
                    </p>
                    <p className="mt-1 font-bold text-blue-800">
                      {assignment.team_name}
                    </p>
                    <p className="text-blue-800">
                      {assignment.personnel_name}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-blue-700">
                      Assigned {formatDateTime(assignment.assigned_at)}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAssignTeam}
                  disabled={assignmentLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-700 hover:bg-blue-800 text-white font-black text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  <FiUsers size={14} />
                  {assignmentLoading ? "Assigning..." : "Assign Team"}
                </button>
              </div>

              <div className="hidden print:block p-6 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">
                      Assigned Team
                    </p>
                    <p className="mt-1 font-extrabold text-slate-900">
                      {assignment?.team_name || teamName || "Not assigned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">
                      Assigned Personnel
                    </p>
                    <p className="mt-1 font-extrabold text-slate-900">
                      {assignment?.personnel_name || personnelNames.join(", ") || "Not assigned"}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[9px] font-black uppercase text-slate-400">
                    Assignment Notes
                  </p>
                  <p className="mt-1 text-slate-800">
                    {assignment?.notes || assignmentNotes || "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:rounded-none">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">
                    Case History
                  </p>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Report Timeline
                  </h3>
                </div>
                <FiClock className="text-violet-700" size={20} />
              </div>

              <div className="p-6 space-y-5">
                {timeline.length > 0 ? (
                  timeline.map((event, index) => (
                    <div key={event.id} className="relative pl-7">
                      {index < timeline.length - 1 && (
                        <span className="absolute left-[7px] top-5 bottom-[-20px] w-px bg-slate-200" />
                      )}
                      <span className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-white border-4 border-violet-500" />
                      <p className="text-xs font-black text-slate-900">
                        {event.status}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                        {formatDateTime(event.changed_at)}
                      </p>
                      {event.note && (
                        <p className="mt-1 text-xs leading-5 text-slate-700">
                          {event.note}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-semibold text-slate-400">
                    No timeline entries yet.
                  </p>
                )}
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:rounded-none print:break-inside-avoid">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                    Barangay Action
                  </p>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Update Case
                  </h3>
                </div>
                <FiCheckCircle className="text-emerald-700" size={20} />
              </div>

              <div className="p-6 space-y-4 print:hidden">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Report Status
                  </label>
                  <select
                    value={statusInput}
                    onChange={(event) => setStatusInput(event.target.value)}
                    className="w-full px-3.5 py-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700/20"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} — {option.helper}
                      </option>
                    ))}
                  </select>
                </div>

                {statusInput === "Rejected" && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-rose-700 mb-1.5">
                      Rejection Reason
                    </label>
                    <textarea
                      rows={3}
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      placeholder="Enter the reason for rejection"
                      className="w-full px-3.5 py-3 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Barangay Staff Remarks
                  </label>
                  <textarea
                    rows={4}
                    value={remarksInput}
                    onChange={(event) => setRemarksInput(event.target.value)}
                    placeholder="Enter dispatch notes, response details, or resolution notes"
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs rounded-xl shadow-sm disabled:opacity-50"
                >
                  {saving ? "Saving Changes..." : "Save Case Updates"}
                </button>
              </div>

              <div className="hidden print:block p-6 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">
                      Status
                    </p>
                    <p className="mt-1 font-extrabold text-slate-900">
                      {normalizeStatus(report.status)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">
                      Updated
                    </p>
                    <p className="mt-1 font-extrabold text-slate-900">
                      {formatDateTime(report.updated_at || report.created_at)}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[9px] font-black uppercase text-slate-400">
                    Remarks
                  </p>
                  <p className="mt-1 text-slate-800 whitespace-pre-wrap">
                    {report.remarks || "—"}
                  </p>
                </div>
                {report.rejection_reason && (
                  <div className="mt-4">
                    <p className="text-[9px] font-black uppercase text-slate-400">
                      Rejection Reason
                    </p>
                    <p className="mt-1 text-rose-800 whitespace-pre-wrap">
                      {report.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>

        <section className="hidden print:block mt-8 border-t-2 border-slate-300 pt-5 print:break-inside-avoid">
          <div className="grid grid-cols-2 gap-10 text-xs">
            <div>
              <p className="font-black uppercase tracking-wider text-slate-500">
                Prepared by
              </p>
              <div className="h-12 border-b border-slate-400 mt-8" />
              <p className="mt-2 font-bold text-slate-800">
                Barangay Personnel
              </p>
            </div>
            <div>
              <p className="font-black uppercase tracking-wider text-slate-500">
                Reviewed by
              </p>
              <div className="h-12 border-b border-slate-400 mt-8" />
              <p className="mt-2 font-bold text-slate-800">
                Barangay Official
              </p>
            </div>
          </div>
        </section>
      </main>

      {selectedImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 print:hidden"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
          >
            <FiX />
          </button>
          <img
            src={selectedImage}
            alt="Waste evidence"
            className="max-w-[95vw] max-h-[92vh] object-contain rounded-2xl shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
