import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import { supabase } from "../../lib/supabase";
import ResidentLayout from "./Layout";
import "leaflet/dist/leaflet.css";

const pinIcon = L.divIcon({
  className: "custom-pin",
  html: `
    <div style="position: relative; width: 30px; height: 30px;">
      <div style="
        background-color: #10b981;
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid #ffffff;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      "></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

interface ReportDetail {
  id: string;
  title: string;
  waste_type: string;
  description: string;
  image_urls: string[];
  latitude: number;
  longitude: number;
  location_name: string;
  status: "Pending" | "Ongoing" | "Resolved" | "Rejected";
  rejection_reason?: string | null;
  remarks?: string | null;
  created_at: string;
  reporter_name?: string | null;
  reporter_contact?: string | null;
  reporter_email?: string | null;
  reporter_address?: string | null;
  profiles?: {
    full_name?: string;
    contact_number?: string;
    email?: string;
    address?: string;
  } | null;
}

export default function ReportDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function fetchReportDetails() {
      if (!id) return;
      try {
        setLoading(true);
        setErrorMsg("");

        const { data, error } = await supabase
          .from("reports")
          .select("*, profiles(*)")
          .eq("id", id)
          .single();

        if (error) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("reports")
            .select("*")
            .eq("id", id)
            .single();

          if (fallbackError) throw fallbackError;
          setReport(fallbackData as ReportDetail);
        } else {
          setReport(data as ReportDetail);
        }
      } catch (err: any) {
        console.error("Failed to fetch report details from Supabase:", err);
        setErrorMsg("Couldn't load report details.");
      } finally {
        setLoading(false);
      }
    }

    fetchReportDetails();
  }, [id]);

  if (loading) {
    return (
      <ResidentLayout title="Report Details">
        <div className="flex h-64 items-center justify-center text-sm font-semibold text-slate-500">
          Loading report details from database...
        </div>
      </ResidentLayout>
    );
  }

  if (errorMsg || !report) {
    return (
      <ResidentLayout title="Report Details">
        <div className="p-6 text-center">
          <p className="text-sm text-slate-600">{errorMsg || "Report not found."}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-3 text-xs font-bold text-emerald-700 underline"
          >
            Go Back
          </button>
        </div>
      </ResidentLayout>
    );
  }

  const reporterName =
    report.reporter_name ||
    report.profiles?.full_name ||
    "Charity Salinas";

  const reporterContact =
    report.reporter_contact ||
    report.profiles?.contact_number ||
    "0917-123-4567";

  const reporterEmail =
    report.reporter_email ||
    report.profiles?.email ||
    "charity@gmail.com";

  const reporterAddress =
    report.reporter_address ||
    report.profiles?.address ||
    "Purok 3, Barangay Tankulan, Manolo Fortich";

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Ongoing":
      case "On-going":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Resolved":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Rejected":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  return (
    <ResidentLayout title="Report Details">
      <div className="mx-auto max-w-md bg-white p-5 space-y-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            ← Back
          </button>
          <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            {report.id}
          </span>
        </div>

        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            Issue Type:
          </label>
          <p className="text-base font-extrabold text-slate-900">
            {report.waste_type || report.title}
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 block border-b border-slate-200 pb-1.5">
            Reporter Information
          </span>
          <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Full Name:</span>
              <span className="font-extrabold text-slate-900">{reporterName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Contact No:</span>
              <span className="font-bold text-slate-800">{reporterContact}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Email:</span>
              <span className="font-semibold text-slate-700">{reporterEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Home Address:</span>
              <span className="font-semibold text-slate-800 text-right">{reporterAddress}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            Description:
          </label>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
            {report.description}
          </p>
        </div>

        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
            Photo
          </label>
          <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
            {report.image_urls && report.image_urls.length > 0 ? (
              <img
                src={report.image_urls[0]}
                alt={report.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No photo uploaded
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
            Location:
          </label>
          <p className="text-xs font-bold text-slate-900 mb-2">
            {report.location_name || "Barangay Tankulan, Manolo Fortich"}
          </p>
          <div className="h-40 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <MapContainer
              center={[report.latitude, report.longitude]}
              zoom={16}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
              dragging={false}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[report.latitude, report.longitude]} icon={pinIcon} />
            </MapContainer>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Status:
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold border ${getStatusBadgeClass(
              report.status
            )}`}
          >
            {report.status}
          </span>
        </div>

        {report.status === "Rejected" && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-900">
              <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
              Reason for Rejection:
            </div>
            <p className="text-xs text-rose-800 leading-relaxed font-medium">
              {report.rejection_reason || "Report rejected by Barangay Official."}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span className="font-semibold">Date Submitted:</span>
          <span>
            {new Date(report.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </ResidentLayout>
  );
}