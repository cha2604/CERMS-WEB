import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import {
  getAdminReportById,
  updateReportStatusAndRemarks,
  type AdminReportDetail,
} from "../../lib/AdminReport";
import type { ReportStatus } from "../../lib/DashboardQueries";

const STATUS_OPTIONS: ReportStatus[] = ["Pending", "Ongoing", "Resolved", "Rejected"];

const SEVERITY_STYLES: Record<string, string> = {
  Critical: "bg-red-600",
  High: "bg-orange-500",
  Moderate: "bg-yellow-500",
  Low: "bg-green-600",
  "Very Low": "bg-sky-500",
};

export default function AdminReportDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<AdminReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [statusInput, setStatusInput] = useState<ReportStatus>("Pending");
  const [remarksInput, setRemarksInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const data = await getAdminReportById(id as string);
        if (isMounted && data) {
          setReport(data);
          setStatusInput(data.status);
          setRemarksInput(data.admin_remarks ?? "");
        }
      } catch (err) {
        console.error("Failed to load report:", err);
        if (isMounted) setErrorMessage("Couldn't load this report.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [id]);

  async function handleSave() {
    if (!id) return;

    setSaving(true);
    setSaveMessage("");

    try {
      await updateReportStatusAndRemarks(id, statusInput, remarksInput);
      setSaveMessage("Changes saved successfully.");
    } catch (err) {
      console.error("Failed to save changes:", err);
      setSaveMessage("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        Loading report...
      </div>
    );
  }

  if (errorMessage || !report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-gray-500">
        <p>{errorMessage || "Report not found."}</p>
        <Link to="/admin/reports" className="text-green-700 hover:underline">
          Back to Reports
        </Link>
      </div>
    );
  }

  const exif = report.exif_data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/reports")}
            aria-label="Back to reports"
            className="rounded-full p-2 text-green-700 transition hover:bg-green-50"
          >
            <FiArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-slate-800">Report Details</h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-8 py-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            {report.image_urls.length > 0 ? (
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src={report.image_urls[0]}
                  alt={report.title}
                  className="h-64 w-full object-cover"
                />
                {report.severity && (
                  <span
                    className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-white ${
                      SEVERITY_STYLES[report.severity] ?? "bg-gray-500"
                    }`}
                  >
                    {report.severity}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-400">
                No photo submitted
              </div>
            )}

            {report.image_urls.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {report.image_urls.slice(1).map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Additional ${index + 1}`}
                    className="h-16 w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
            <DetailRow label="Report ID" value={`#${report.id.slice(0, 8)}`} />
            <DetailRow label="Type of Concern" value={report.category} />
            <DetailRow
              label="Coordinates"
              value={
                report.latitude && report.longitude
                  ? `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`
                  : "Not captured"
              }
            />
            <DetailRow
              label="Date Reported"
              value={new Date(report.created_at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            />
            <DetailRow label="Reporter" value={report.reporter_name} />
            <DetailRow
              label="Contact"
              value={report.contact_number || report.reporter_phone || "Not provided"}
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            Description
          </h2>
          <p className="text-sm text-slate-600">{report.description}</p>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            EXIF Metadata
          </h2>

          {exif ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailRow
                label="Date Taken"
                value={
                  exif.dateTaken
                    ? new Date(exif.dateTaken).toLocaleString()
                    : "Not available"
                }
              />
              <DetailRow label="Device" value={exif.device || "Not available"} />
              <DetailRow
                label="Latitude"
                value={exif.latitude !== null ? exif.latitude.toFixed(6) : "Not available"}
              />
              <DetailRow
                label="Longitude"
                value={exif.longitude !== null ? exif.longitude.toFixed(6) : "Not available"}
              />
              <DetailRow
                label="Altitude"
                value={exif.altitude !== null ? `${exif.altitude.toFixed(1)} m` : "Not available"}
              />
              <DetailRow
                label="Image Size"
                value={
                  exif.imageWidth && exif.imageHeight
                    ? `${exif.imageWidth} x ${exif.imageHeight}`
                    : "Not available"
                }
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              No EXIF metadata available for this photo.
            </p>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Update Status
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Status
              </label>
              <select
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value as ReportStatus)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-700 focus:ring-4 focus:ring-green-100"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Remarks (Optional)
              </label>
              <input
                type="text"
                value={remarksInput}
                onChange={(e) => setRemarksInput(e.target.value)}
                placeholder="Enter remarks..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-700 focus:ring-4 focus:ring-green-100"
              />
            </div>
          </div>

          {saveMessage && (
            <p className="mt-3 text-sm text-green-700">{saveMessage}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-slate-700">{value}</span>
    </div>
  );
}