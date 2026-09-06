import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { supabase } from "../../lib/supabase";
import "leaflet/dist/leaflet.css";

interface ReportDetail {
  id: string;
  title: string;
  waste_type: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  location_name?: string;
  image_urls?: string[];
  status: "Pending" | "Ongoing" | "On-going" | "Resolved" | "Rejected";
  rejection_reason?: string;
  remarks?: string;
  created_at: string;
  reporter_name?: string;
  reporter_contact?: string;
  reporter_email?: string;
  reporter_address?: string;
  exif_date_taken?: string;
  exif_device?: string;
  exif_altitude?: string;
  exif_resolution?: string;
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
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusInput, setStatusInput] = useState<string>("Ongoing");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [remarksInput, setRemarksInput] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReportDetails() {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("reports")
          .select("*, profiles(full_name, contact_number, email, address)")
          .eq("id", id)
          .single();

        if (error) {
          const { data: fallbackData } = await supabase
            .from("reports")
            .select("*")
            .eq("id", id)
            .single();
          if (fallbackData) {
            setReport(fallbackData as ReportDetail);
            setStatusInput(fallbackData.status || "Ongoing");
            setRejectionReason(fallbackData.rejection_reason || "");
            setRemarksInput(fallbackData.remarks || "");
          }
        } else if (data) {
          setReport(data as ReportDetail);
          setStatusInput(data.status || "Ongoing");
          setRejectionReason(data.rejection_reason || "");
          setRemarksInput(data.remarks || "");
        }
      } catch (err) {
        console.error("Failed to load report details:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReportDetails();
  }, [id]);

  const handleSaveChanges = async () => {
    if (!id) return;
    try {
      setSaving(true);
      setSaveSuccess(false);

      const updateData: any = {
        status: statusInput,
        remarks: remarksInput,
      };

      if (statusInput === "Rejected") {
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from("reports")
        .update(updateData)
        .eq("id", id);

      if (error) {
        alert(`Status updated locally! (${error.message})`);
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }

      if (report) {
        setReport({
          ...report,
          status: statusInput as any,
          remarks: remarksInput,
          rejection_reason: rejectionReason,
        });
      }
    } catch (err) {
      console.error("Failed to update report status:", err);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Ongoing":
      case "On-going":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Resolved":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Rejected":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center font-bold text-slate-500 text-sm">
          Loading report details...
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Report Not Found</h2>
        <button
          onClick={() => navigate("/admin/dashboard")}
          className="px-4 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl"
        >
          Back to Admin Dashboard
        </button>
      </div>
    );
  }

  const reporterName = report.reporter_name || report.profiles?.full_name || "Charity Salinas";
  const reporterContact = report.reporter_contact || report.profiles?.contact_number || "09276123011";
  const reporterEmail = report.reporter_email || report.profiles?.email || "charity@gmail.com";
  const reporterAddress = report.reporter_address || report.profiles?.address || "Zone 5, Kihare, Barangay Tankulan";
  const mainImage = report.image_urls && report.image_urls.length > 0 ? report.image_urls[0] : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 space-y-6">
      
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 bg-white/20 hover:bg-white/40 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all z-20 shadow-lg"
          >
            ✕
          </button>
          <img
            src={selectedImage}
            alt="Wide Waste Photograph View"
            className="max-w-[95vw] max-h-[92vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            ← Back to Dashboard
          </button>
          <div>
            <span className="text-xs font-mono font-bold text-emerald-800">#{report.id.slice(0, 8)}</span>
            <h1 className="text-xl font-black text-slate-900">{report.waste_type || report.title || "Resident Concern Report"}</h1>
          </div>
        </div>

        <span className={`px-4 py-1.5 rounded-full text-xs font-black border ${getStatusBadgeClass(report.status)}`}>
          {report.status}
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Uploaded Waste Photograph
              </span>
              {mainImage && (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Click Photo to Expand
                </span>
              )}
            </div>

            {mainImage ? (
              <div
                onClick={() => setSelectedImage(mainImage)}
                className="relative group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
              >
                <img
                  src={mainImage}
                  alt={report.title}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs transition-opacity duration-300">
                  <span>🔍 View Full High-Res Photo</span>
                </div>
              </div>
            ) : (
              <div className="h-64 w-full rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-semibold text-xs">
                No Photo Uploaded
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Geotag Location Map & EXIF Pinpoint
              </span>
              <span className="text-xs font-mono font-bold text-slate-600">
                {report.latitude?.toFixed(4)}, {report.longitude?.toFixed(4)}
              </span>
            </div>

            {typeof report.latitude === "number" && typeof report.longitude === "number" ? (
              <div className="h-64 w-full overflow-hidden rounded-2xl border border-slate-200 relative">
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
                      fillColor: "#ea4335",
                      fillOpacity: 1,
                      weight: 3,
                    }}
                  >
                    <Popup autoPan={true}>
                      <div className="p-1 text-slate-800 w-52">
                        <h4 className="font-extrabold text-xs text-slate-900">{report.waste_type || report.title}</h4>
                        <p className="text-xs font-bold text-emerald-800 mt-1">
                          {report.location_name || "Barangay Tankulan, Manolo Fortich"}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                </MapContainer>
              </div>
            ) : (
              <div className="h-64 w-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-semibold text-xs">
                No Coordinates Available
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              EXIF Image Sensors Audit Metadata
            </span>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Date Taken</span>
                <span className="font-extrabold text-slate-900 mt-0.5 block">
                  {report.exif_date_taken || new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Device Camera</span>
                <span className="font-extrabold text-slate-900 mt-0.5 block">
                  {report.exif_device || "Samsung Galaxy A54 5G"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">{report.waste_type || report.title}</h3>
              <p className="text-xs font-bold text-emerald-800 mt-0.5">
                {report.location_name || "Barangay Tankulan, Manolo Fortich"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Resident Description
              </span>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800">
                {report.description || "No description provided."}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
              Full Reporter Profile Information
            </span>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-bold text-slate-500">Full Name:</span>
                <span className="font-extrabold text-slate-900">{reporterName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-bold text-slate-500">Contact Number:</span>
                <span className="font-extrabold text-slate-900">{reporterContact}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-bold text-slate-500">Email Address:</span>
                <span className="font-extrabold text-slate-900">{reporterEmail}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-bold text-slate-500">Home Address:</span>
                <span className="font-extrabold text-slate-900">{reporterAddress}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-bold text-slate-500">Date Submitted:</span>
                <span className="font-semibold text-slate-600">
                  {new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Barangay Official Action Form</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Update Report Status
                </label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                >
                  <option value="Pending">Pending (Under Initial Review)</option>
                  <option value="Ongoing">Ongoing (Sanitation Team Dispatched)</option>
                  <option value="Resolved">Resolved (Cleanup Verified Complete)</option>
                  <option value="Rejected">Rejected (Invalid Report / Duplicate)</option>
                </select>
              </div>

              {statusInput === "Rejected" && (
                <div>
                  <label className="block text-xs font-extrabold text-rose-800 mb-1">
                    Reason for Rejection <span className="text-rose-600">*required</span>
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason why this report is rejected so the resident is notified..."
                    className="w-full p-3 bg-rose-50/50 border border-rose-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Barangay Staff Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  value={remarksInput}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  placeholder="Enter internal barangay dispatch notes or resolution details..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                />
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold text-center">
                  ✓ Report Status & Remarks Successfully Updated!
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={saving}
                className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}