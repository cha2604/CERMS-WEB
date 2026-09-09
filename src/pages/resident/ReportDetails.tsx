import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import { supabase } from "../../lib/supabase";
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
  image_urls?: string[] | null;
  latitude: number | null;
  longitude: number | null;
  location_name?: string | null;
  status:
    | "Pending"
    | "Ongoing"
    | "On-going"
    | "Resolved"
    | "Rejected";
  rejection_reason?: string | null;
  remarks?: string | null;
  created_at: string;
  reporter_name?: string | null;
  reporter_contact?: string | null;
  reporter_email?: string | null;
  reporter_address?: string | null;
  profiles?: {
    full_name?: string | null;
    contact_number?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
}

export default function ReportDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [editData, setEditData] = useState({
    waste_type: "",
    description: "",
    location_name: "",
  });

  useEffect(() => {
    async function fetchReportDetails() {
      if (!id) {
        setErrorMsg("Report ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMsg("");

        const { data, error } = await supabase
          .from("reports")
          .select("*, profiles(*)")
          .eq("id", id)
          .single();

        if (error) {
          const { data: fallbackData, error: fallbackError } =
            await supabase
              .from("reports")
              .select("*")
              .eq("id", id)
              .single();

          if (fallbackError) {
            throw fallbackError;
          }

          const fallbackReport = fallbackData as ReportDetail;

          setReport(fallbackReport);

          setEditData({
            waste_type:
              fallbackReport.waste_type ||
              fallbackReport.title ||
              "",
            description: fallbackReport.description || "",
            location_name:
              fallbackReport.location_name ||
              "Barangay Tankulan, Manolo Fortich",
          });
        } else {
          const currentReport = data as ReportDetail;

          setReport(currentReport);

          setEditData({
            waste_type:
              currentReport.waste_type ||
              currentReport.title ||
              "",
            description: currentReport.description || "",
            location_name:
              currentReport.location_name ||
              "Barangay Tankulan, Manolo Fortich",
          });
        }
      } catch (error) {
        console.error(
          "Failed to fetch report details from Supabase:",
          error
        );

        setErrorMsg("Couldn't load report details.");
      } finally {
        setLoading(false);
      }
    }

    fetchReportDetails();
  }, [id]);

  const handleStartEditing = () => {
    if (!report || report.status !== "Pending") {
      return;
    }

    setEditData({
      waste_type: report.waste_type || report.title || "",
      description: report.description || "",
      location_name:
        report.location_name ||
        "Barangay Tankulan, Manolo Fortich",
    });

    setSaveMessage("");
    setSaveError("");
    setEditing(true);
  };

  const handleCancelEditing = () => {
    if (!report) {
      return;
    }

    setEditData({
      waste_type: report.waste_type || report.title || "",
      description: report.description || "",
      location_name:
        report.location_name ||
        "Barangay Tankulan, Manolo Fortich",
    });

    setSaveMessage("");
    setSaveError("");
    setEditing(false);
  };

  const handleSaveChanges = async () => {
    if (!report || !id || report.status !== "Pending") {
      return;
    }

    const wasteType = editData.waste_type.trim();
    const description = editData.description.trim();
    const locationName = editData.location_name.trim();

    if (!wasteType || !description || !locationName) {
      setSaveError("Please complete all editable fields.");
      setSaveMessage("");
      return;
    }

    try {
      setSaving(true);
      setSaveMessage("");
      setSaveError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSaveError("Please log in again to edit your report.");
        return;
      }

      const { data, error } = await supabase
        .from("reports")
        .update({
          title: wasteType,
          waste_type: wasteType,
          description,
          location_name: locationName,
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("status", "Pending")
        .select("*, profiles(*)")
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("The report could not be updated.");
      }

      const updatedReport = data as ReportDetail;

      setReport(updatedReport);

      setEditData({
        waste_type:
          updatedReport.waste_type ||
          updatedReport.title ||
          "",
        description: updatedReport.description || "",
        location_name:
          updatedReport.location_name ||
          "Barangay Tankulan, Manolo Fortich",
      });

      setEditing(false);
      setSaveMessage("Report updated successfully.");
    } catch (error) {
      console.error("Failed to update report:", error);

      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to update report."
      );
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
        return "bg-blue-100 text-blue-800 border-blue-300";

      case "Resolved":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";

      case "Rejected":
        return "bg-rose-100 text-rose-800 border-rose-300";

      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm font-semibold text-slate-500">
        Loading report details from database...
      </div>
    );
  }

  if (errorMsg || !report) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="text-sm text-slate-600">
          {errorMsg || "Report not found."}
        </p>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-3 text-xs font-bold text-emerald-700 underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  const reporterName =
    report.reporter_name ||
    report.profiles?.full_name ||
    "Resident";

  const reporterContact =
    report.reporter_contact ||
    report.profiles?.contact_number ||
    "Not provided";

  const reporterEmail =
    report.reporter_email ||
    report.profiles?.email ||
    "Not provided";

  const reporterAddress =
    report.reporter_address ||
    report.profiles?.address ||
    "Not provided";

  const hasCoordinates =
    typeof report.latitude === "number" &&
    typeof report.longitude === "number";

  return (
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

      {saveMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
          {saveMessage}
        </div>
      )}

      {saveError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
          {saveError}
        </div>
      )}

      <div>
        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1">
          Issue Type:
        </label>

        {editing ? (
          <input
            type="text"
            value={editData.waste_type}
            onChange={(event) =>
              setEditData((current) => ({
                ...current,
                waste_type: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        ) : (
          <p className="text-base font-extrabold text-slate-900">
            {report.waste_type || report.title}
          </p>
        )}
      </div>

      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 block border-b border-slate-200 pb-1.5">
          Reporter Information
        </span>

        <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-700">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500 font-semibold">
              Full Name:
            </span>

            <span className="font-extrabold text-slate-900 text-right">
              {reporterName}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-slate-500 font-semibold">
              Contact No:
            </span>

            <span className="font-bold text-slate-800 text-right">
              {reporterContact}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-slate-500 font-semibold">
              Email:
            </span>

            <span className="font-semibold text-slate-700 text-right break-all">
              {reporterEmail}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-slate-500 font-semibold">
              Home Address:
            </span>

            <span className="font-semibold text-slate-800 text-right">
              {reporterAddress}
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1">
          Description:
        </label>

        {editing ? (
          <textarea
            value={editData.description}
            onChange={(event) =>
              setEditData((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            rows={5}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        ) : (
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
            {report.description || "No description provided."}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
          Photo
        </label>

        <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
          {report.image_urls &&
          report.image_urls.length > 0 ? (
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

        {editing ? (
          <input
            type="text"
            value={editData.location_name}
            onChange={(event) =>
              setEditData((current) => ({
                ...current,
                location_name: event.target.value,
              }))
            }
            className="w-full mb-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        ) : (
          <p className="text-xs font-bold text-slate-900 mb-2">
            {report.location_name ||
              "Barangay Tankulan, Manolo Fortich"}
          </p>
        )}

        {hasCoordinates ? (
          <div className="h-40 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <MapContainer
              center={[
                report.latitude as number,
                report.longitude as number,
              ]}
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

              <Marker
                position={[
                  report.latitude as number,
                  report.longitude as number,
                ]}
                icon={pinIcon}
              />
            </MapContainer>
          </div>
        ) : (
          <div className="h-40 w-full flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-xs text-slate-400">
            Location coordinates unavailable
          </div>
        )}
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

      {report.status === "Pending" && (
        <div className="border-t border-slate-100 pt-4">
          {editing ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={saving}
                className="flex-1 rounded-xl bg-emerald-800 py-3 text-xs font-black text-white transition-all hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={handleCancelEditing}
                disabled={saving}
                className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-xs font-black text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartEditing}
              className="w-full rounded-xl bg-emerald-800 py-3 text-xs font-black text-white transition-all hover:bg-emerald-900"
            >
              Edit Report
            </button>
          )}
        </div>
      )}

      {(report.status === "Ongoing" ||
        report.status === "On-going") && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-800">
          This report is already being processed by the barangay and can no longer be edited.
        </div>
      )}

      {report.status === "Resolved" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
          This report has been resolved and can no longer be edited.
        </div>
      )}

      {report.status === "Rejected" && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 space-y-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-900">
            <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
            Reason for Rejection:
          </div>

          <p className="text-xs text-rose-800 leading-relaxed font-medium">
            {report.rejection_reason ||
              "Report rejected by Barangay Official."}
          </p>
        </div>
      )}

      {report.status === "Resolved" && report.remarks && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-1.5">
          <span className="font-bold block text-[10px] uppercase text-emerald-800">
            Barangay Official Remarks:
          </span>

          <p className="text-xs text-emerald-900 leading-relaxed font-medium">
            {report.remarks}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="font-semibold">
          Date Submitted:
        </span>

        <span>
          {new Date(report.created_at).toLocaleDateString(
            undefined,
            {
              month: "short",
              day: "numeric",
              year: "numeric",
            }
          )}
        </span>
      </div>
    </div>
  );
}