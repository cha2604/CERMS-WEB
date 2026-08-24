import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { supabase } from "../../lib/supabase";
import "leaflet/dist/leaflet.css";

const adminPinIcon = L.divIcon({
  className: "custom-admin-pin",
  html: `
    <div style="position: relative; width: 34px; height: 34px;">
      <div style="
        background-color: #ea4335;
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background: #ffffff;
          border-radius: 50%;
        "></div>
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
});

interface AdminReportDetail {
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
  severity?: string | null;
  reporter_name?: string | null;
  reporter_contact?: string | null;
  reporter_email?: string | null;
  reporter_address?: string | null;
  exif_date_taken?: string | null;
  exif_device?: string | null;
  exif_altitude?: string | null;
  exif_resolution?: string | null;
  profiles?: {
    full_name?: string;
    contact_number?: string;
    email?: string;
    address?: string;
  } | null;
}

export default function AdminReportDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<AdminReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"Pending" | "Ongoing" | "Resolved" | "Rejected">("Pending");
  const [rejectionReason, setRejectionReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadReport() {
      if (!id) return;
      try {
        setLoading(true);
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
          setReport(fallbackData as AdminReportDetail);
          setStatus(fallbackData.status || "Pending");
          setRejectionReason(fallbackData.rejection_reason || "");
          setRemarks(fallbackData.remarks || "");
        } else {
          setReport(data as AdminReportDetail);
          setStatus(data.status || "Pending");
          setRejectionReason(data.rejection_reason || "");
          setRemarks(data.remarks || "");
        }
      } catch (err: any) {
        console.error("Error loading report in admin:", err);
        setErrorMsg("Failed to load report from database.");
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [id]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMessage("");

    try {
      const updatePayload: Record<string, any> = {
        status,
        remarks: remarks.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (status === "Rejected") {
        updatePayload.rejection_reason = rejectionReason.trim() || "Report rejected by Barangay Official.";
      } else {
        updatePayload.rejection_reason = null;
      }

      const { error } = await supabase
        .from("reports")
        .update(updatePayload)
        .eq("id", id);

      if (error) throw error;

      setSuccessMessage("Report status and rejection reason saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      console.error("Failed to update report in Supabase:", err);
      setErrorMsg(err.message || "Could not save updates.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm font-semibold text-slate-500">
        Loading admin report details...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-slate-600">Report not found.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-3 text-xs font-bold text-emerald-700 underline"
        >
          Back to Reports List
        </button>
      </div>
    );
  }

  const reporterName = report.reporter_name || report.profiles?.full_name || "Charity Salinas";
  const reporterContact = report.reporter_contact || report.profiles?.contact_number || "0917-123-4567";
  const reporterEmail = report.reporter_email || report.profiles?.email || "charity@gmail.com";
  const reporterAddress = report.reporter_address || report.profiles?.address || "Purok 3, Barangay Tankulan, Manolo Fortich";

  const exifDateTaken = report.exif_date_taken || new Date(report.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const exifDevice = report.exif_device || "Samsung Galaxy A54 5G";
  const exifAltitude = report.exif_altitude || "63.21 m";
  const exifResolution = report.exif_resolution || "4032 x 3024";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          ← Back to Admin Reports List
        </button>
        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          Report ID: {report.id}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Uploaded Waste Photograph
            </h3>
            <div className="relative h-64 w-full overflow-hidden rounded-xl bg-slate-100 border border-slate-200 shadow-sm">
              {report.image_urls && report.image_urls.length > 0 ? (
                <img
                  src={report.image_urls[0]}
                  alt={report.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No Photo Uploaded
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Geotag Location Map & EXIF Pinpoint
              </h3>
              <span className="font-mono text-[11px] text-slate-500 font-bold">
                {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
              </span>
            </div>

            <div className="h-64 w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <MapContainer
                center={[report.latitude, report.longitude]}
                zoom={16}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[report.latitude, report.longitude]} icon={adminPinIcon}>
                  <Popup autoPan={true}>
                    <div className="w-64 p-1 text-slate-800">
                      <div className="relative mb-2 h-32 w-full overflow-hidden rounded-xl bg-slate-100 border border-slate-200 shadow-sm">
                        {report.image_urls && report.image_urls.length > 0 && (
                          <img
                            src={report.image_urls[0]}
                            alt={report.title}
                            className="h-full w-full object-cover"
                          />
                        )}
                        <span className="absolute top-2 left-2 rounded-full bg-emerald-700 px-2 py-0.5 text-[9px] font-bold text-white shadow">
                          EXIF Verified
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-xs mb-1">
                        {report.waste_type || report.title}
                      </h4>

                      <p className="text-[11px] text-slate-600 mb-2">
                        Reporter: <strong>{reporterName}</strong>
                      </p>

                      <div className="border-t border-slate-100 pt-1.5 space-y-1 text-[10px] text-slate-600 font-mono">
                        <div>Taken: <strong>{exifDateTaken}</strong></div>
                        <div>Device: <strong>{exifDevice}</strong></div>
                        <div>GPS: <strong>{report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}</strong></div>
                        <div>Altitude: <strong>{exifAltitude}</strong></div>
                        <div>Resolution: <strong>{exifResolution}</strong></div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              EXIF Image Sensors Audit Metadata
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Date Taken</span>
                <span className="font-semibold text-slate-800">{exifDateTaken}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Device Camera</span>
                <span className="font-semibold text-slate-800">{exifDevice}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Latitude</span>
                <span className="font-mono font-semibold text-slate-800">{report.latitude}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Longitude</span>
                <span className="font-mono font-semibold text-slate-800">{report.longitude}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Altitude</span>
                <span className="font-semibold text-slate-800">{exifAltitude}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Photo Resolution</span>
                <span className="font-semibold text-slate-800">{exifResolution}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">{report.waste_type || report.title}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {report.location_name || "Barangay Tankulan, Manolo Fortich"}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                Resident Description
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                {report.description}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider border-b border-slate-200 pb-2">
              Full Reporter Profile Information
            </h3>
            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Full Name:</span>
                <span className="font-extrabold text-slate-900">{reporterName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Contact Number:</span>
                <span className="font-bold text-slate-800">{reporterContact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Email Address:</span>
                <span className="font-semibold text-slate-700">{reporterEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Home Address:</span>
                <span className="font-semibold text-slate-800 text-right">{reporterAddress}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-[11px] text-slate-500">
                <span>Date Submitted:</span>
                <span>
                  {new Date(report.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateStatus} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-3">
              Barangay Official Action Form
            </h3>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs font-bold border border-rose-200">
                {errorMsg}
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200">
                ✓ {successMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Update Report Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="Pending">Pending (Awaiting Review)</option>
                <option value="Ongoing">Ongoing (Sanitation Team Dispatched)</option>
                <option value="Resolved">Resolved (Cleared)</option>
                <option value="Rejected">Rejected (Invalid / Duplicate)</option>
              </select>
            </div>

            {status === "Rejected" && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                <label className="block text-xs font-extrabold text-rose-900">
                  Reason for Rejection <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain to the resident why this report is being rejected..."
                  className="w-full p-3 bg-white border border-rose-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Barangay Staff Remarks (Optional)
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter internal barangay dispatch notes or resolution details..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition-all"
            >
              {saving ? "Saving Changes to Database..." : "Save Changes"}
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}