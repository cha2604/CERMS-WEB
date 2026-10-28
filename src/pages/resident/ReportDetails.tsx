import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCamera,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiFileText,
  FiInfo,
  FiMapPin,
  FiTrash2,
  FiXCircle,
} from "react-icons/fi";
import {
  MapContainer,
  TileLayer,
  Marker,
} from "react-leaflet";
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
  severity?: string | null;
  status:
    | "Pending"
    | "Ongoing"
    | "On-going"
    | "Resolved"
    | "Rejected";
  rejection_reason?: string | null;
  remarks?: string | null;
  created_at: string;
}

interface StatusHistory {
  id: string;
  report_id: string;
  status: string;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
}

function normalizeStatus(
  status: string
) {
  return status === "On-going"
    ? "Ongoing"
    : status;
}

function formatDateTime(
  value: string
) {
  return new Date(
    value
  ).toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  );
}

function formatDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function getStatusBadgeClass(
  status: string
) {
  switch (
    normalizeStatus(
      status
    )
  ) {
    case "Pending":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "Ongoing":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "Resolved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "Rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getSeverityBadgeClass(
  severity?: string | null
) {
  switch (
    (
      severity || ""
    ).toLowerCase()
  ) {
    case "high":
      return "border-rose-200 bg-rose-50 text-rose-700";

    case "moderate":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "low":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "none":
      return "border-slate-200 bg-slate-50 text-slate-600";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export default function ReportDetails() {
  const { id } =
    useParams<{
      id: string;
    }>();

  const navigate =
    useNavigate();

  const [searchParams] =
    useSearchParams();

  const timelineRef =
    useRef<HTMLDivElement>(
      null
    );

  const [
    report,
    setReport,
  ] =
    useState<ReportDetail | null>(
      null
    );

  const [
    history,
    setHistory,
  ] =
    useState<
      StatusHistory[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    historyLoading,
    setHistoryLoading,
  ] =
    useState(false);

  const [
    errorMsg,
    setErrorMsg,
  ] =
    useState("");

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    saveMessage,
    setSaveMessage,
  ] =
    useState("");

  const [
    saveError,
    setSaveError,
  ] =
    useState("");

  const [
    editData,
    setEditData,
  ] =
    useState({
      waste_type: "",
      description: "",
      location_name: "",
    });

  const loadReportHistory =
    async (
      reportId: string
    ) => {
      try {
        setHistoryLoading(
          true
        );

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "report_status_history"
            )
            .select(
              "id, report_id, status, note, changed_by, changed_at"
            )
            .eq(
              "report_id",
              reportId
            )
            .order(
              "changed_at",
              {
                ascending:
                  true,
              }
            );

        if (error) {
          throw error;
        }

        setHistory(
          (data ||
            []) as StatusHistory[]
        );
      } catch (error) {
        console.error(
          "Failed to load report timeline:",
          error
        );

        setHistory([]);
      } finally {
        setHistoryLoading(
          false
        );
      }
    };

  useEffect(() => {
    async function fetchReportDetails() {
      if (!id) {
        setErrorMsg(
          "Report ID is missing."
        );

        setLoading(
          false
        );

        return;
      }

      try {
        setLoading(
          true
        );

        setErrorMsg(
          ""
        );

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "reports"
            )
            .select(
              "id, title, waste_type, description, image_urls, latitude, longitude, location_name, severity, status, rejection_reason, remarks, created_at"
            )
            .eq(
              "id",
              id
            )
            .single();

        if (error) {
          throw error;
        }

        const currentReport =
          data as ReportDetail;

        setReport(
          currentReport
        );

        setEditData({
          waste_type:
            currentReport.waste_type ||
            currentReport.title ||
            "",

          description:
            currentReport.description ||
            "",

          location_name:
            currentReport.location_name ||
            "Barangay Tankulan, Manolo Fortich",
        });

        await loadReportHistory(
          id
        );
      } catch (error) {
        console.error(
          "Failed to fetch report details:",
          error
        );

        setErrorMsg(
          "Couldn't load report details."
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    fetchReportDetails();
  }, [id]);

  useEffect(() => {
    if (
      loading ||
      !report
    ) {
      return;
    }

    if (
      searchParams.get(
        "view"
      ) !== "timeline"
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          timelineRef.current?.scrollIntoView(
            {
              behavior:
                "smooth",
              block:
                "start",
            }
          );
        },
        300
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    loading,
    report,
    searchParams,
  ]);

  const handleStartEditing =
    () => {
      if (
        !report ||
        normalizeStatus(
          report.status
        ) !== "Pending"
      ) {
        return;
      }

      setEditData({
        waste_type:
          report.waste_type ||
          report.title ||
          "",

        description:
          report.description ||
          "",

        location_name:
          report.location_name ||
          "Barangay Tankulan, Manolo Fortich",
      });

      setSaveMessage(
        ""
      );

      setSaveError(
        ""
      );

      setEditing(
        true
      );
    };

  const handleCancelEditing =
    () => {
      if (!report) {
        return;
      }

      setEditData({
        waste_type:
          report.waste_type ||
          report.title ||
          "",

        description:
          report.description ||
          "",

        location_name:
          report.location_name ||
          "Barangay Tankulan, Manolo Fortich",
      });

      setSaveMessage(
        ""
      );

      setSaveError(
        ""
      );

      setEditing(
        false
      );
    };

  const handleSaveChanges =
    async () => {
      if (
        !report ||
        !id ||
        normalizeStatus(
          report.status
        ) !== "Pending"
      ) {
        return;
      }

      const wasteType =
        editData.waste_type.trim();

      const description =
        editData.description.trim();

      const locationName =
        editData.location_name.trim();

      if (
        !wasteType ||
        !description ||
        !locationName
      ) {
        setSaveError(
          "Please complete all editable fields."
        );

        setSaveMessage(
          ""
        );

        return;
      }

      try {
        setSaving(
          true
        );

        setSaveMessage(
          ""
        );

        setSaveError(
          ""
        );

        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user) {
          setSaveError(
            "Please log in again to edit your report."
          );

          return;
        }

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "reports"
            )
            .update({
              title:
                wasteType,

              waste_type:
                wasteType,

              description,

              location_name:
                locationName,
            })
            .eq(
              "id",
              id
            )
            .eq(
              "user_id",
              user.id
            )
            .eq(
              "status",
              "Pending"
            )
            .select(
              "id, title, waste_type, description, image_urls, latitude, longitude, location_name, severity, status, rejection_reason, remarks, created_at"
            )
            .single();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "The report could not be updated."
          );
        }

        const updatedReport =
          data as ReportDetail;

        setReport(
          updatedReport
        );

        setEditData({
          waste_type:
            updatedReport.waste_type ||
            updatedReport.title ||
            "",

          description:
            updatedReport.description ||
            "",

          location_name:
            updatedReport.location_name ||
            "Barangay Tankulan, Manolo Fortich",
        });

        setEditing(
          false
        );

        setSaveMessage(
          "Report updated successfully."
        );
      } catch (error) {
        console.error(
          "Failed to update report:",
          error
        );

        setSaveError(
          error instanceof
            Error
            ? error.message
            : "Failed to update report."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  const getTimelineLabel =
    (
      event: StatusHistory
    ) => {
      const note =
        event.note || "";

      if (
        /^assigned to /i.test(
          note
        )
      ) {
        return "Assigned";
      }

      return normalizeStatus(
        event.status
      );
    };

  const getTimelineNote =
    (
      event: StatusHistory
    ) => {
      const note =
        event.note || "";

      if (
        /^assigned to /i.test(
          note
        )
      ) {
        const assignmentPart =
          note.split(
            " - "
          )[0];

        return (
          assignmentPart ||
          "A response team has been assigned to your report."
        );
      }

      if (
        normalizeStatus(
          event.status
        ) === "Ongoing"
      ) {
        return (
          note ||
          "Barangay personnel are currently handling your report."
        );
      }

      if (
        event.status ===
        "Resolved"
      ) {
        return (
          note ||
          "The reported waste concern has been resolved."
        );
      }

      if (
        event.status ===
        "Rejected"
      ) {
        return (
          note ||
          report?.rejection_reason ||
          "The report was rejected by the barangay."
        );
      }

      return note;
    };

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />

          <p className="mt-3 text-xs font-bold text-slate-500">
            Loading report details...
          </p>
        </div>
      </div>
    );
  }

  if (
    errorMsg ||
    !report
  ) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <FiXCircle
            size={24}
          />
        </div>

        <h2 className="mt-4 text-lg font-black text-slate-900">
          Report unavailable
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          {errorMsg ||
            "Report not found."}
        </p>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/my-reports"
            )
          }
          className="mt-5 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-900"
        >
          Back to My Reports
        </button>
      </div>
    );
  }

  const hasCoordinates =
    typeof report.latitude ===
      "number" &&
    typeof report.longitude ===
      "number";

  const timelineEvents: StatusHistory[] =
    [
      {
        id: `submitted-${report.id}`,
        report_id:
          report.id,
        status:
          "Submitted",
        note:
          "Your report was submitted successfully.",
        changed_by:
          null,
        changed_at:
          report.created_at,
      },
      ...history,
    ];

  const currentStatus =
    normalizeStatus(
      report.status
    );

  const currentSeverity =
    report.severity ||
    "Not assessed";

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <button
        type="button"
        onClick={() =>
          navigate(
            "/my-reports"
          )
        }
        className="inline-flex items-center gap-2 text-sm font-black text-emerald-800 transition hover:text-emerald-900"
      >
        <FiArrowLeft
          size={18}
        />
        Back to My Reports
      </button>

      {saveMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-xs font-bold text-emerald-800">
          {saveMessage}
        </div>
      )}

      {saveError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-xs font-bold text-rose-800">
          {saveError}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
              <FiTrash2
                size={25}
              />
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-900">
                {report.waste_type ||
                  report.title ||
                  "Waste Report"}
              </h1>

              <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                Report #
                {report.id
                  .slice(
                    0,
                    8
                  )
                  .toUpperCase()}
              </p>

              <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <FiClock
                  size={13}
                />

                Submitted{" "}
                {formatDateTime(
                  report.created_at
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div
              className={`min-w-[145px] rounded-2xl border px-4 py-3 ${getStatusBadgeClass(
                currentStatus
              )}`}
            >
              <p className="text-[9px] font-black uppercase tracking-wider opacity-70">
                Status
              </p>

              <p className="mt-1 text-sm font-black">
                {
                  currentStatus
                }
              </p>
            </div>

            <div
              className={`min-w-[145px] rounded-2xl border px-4 py-3 ${getSeverityBadgeClass(
                currentSeverity
              )}`}
            >
              <div className="flex items-center gap-2">
                <FiAlertTriangle
                  size={15}
                />

                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider opacity-70">
                    Automated Severity
                  </p>

                  <p className="mt-1 text-sm font-black">
                    {
                      currentSeverity
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <FiCamera
              size={17}
            />
          </div>

          <h2 className="font-black text-slate-900">
            Photo Evidence
          </h2>
        </div>

        <div className="p-5">
          {report.image_urls &&
          report.image_urls.length >
            0 ? (
            <div className="overflow-hidden rounded-2xl bg-slate-100">
              <img
                src={
                  report
                    .image_urls[0]
                }
                alt={
                  report.title
                }
                className="max-h-[480px] w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-60 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-400">
              No photo available
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <FiFileText
              size={17}
            />
          </div>

          <h2 className="font-black text-slate-900">
            Report Details
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Issue Type
            </p>

            {editing ? (
              <input
                type="text"
                value={
                  editData.waste_type
                }
                onChange={(event) =>
                  setEditData(
                    (
                      current
                    ) => ({
                      ...current,
                      waste_type:
                        event
                          .target
                          .value,
                    })
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              />
            ) : (
              <p className="mt-2 text-base font-black text-slate-900">
                {report.waste_type ||
                  report.title}
              </p>
            )}

            <div className="mt-6">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Description
              </p>

              {editing ? (
                <textarea
                  rows={6}
                  value={
                    editData.description
                  }
                  onChange={(event) =>
                    setEditData(
                      (
                        current
                      ) => ({
                        ...current,
                        description:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                />
              ) : (
                <p className="mt-2 text-sm font-medium leading-7 text-slate-700">
                  {report.description ||
                    "No description provided."}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <FiMapPin
                className="mt-0.5 shrink-0 text-emerald-700"
                size={18}
              />

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Location
                </p>

                {editing ? (
                  <input
                    type="text"
                    value={
                      editData.location_name
                    }
                    onChange={(event) =>
                      setEditData(
                        (
                          current
                        ) => ({
                          ...current,
                          location_name:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-700"
                  />
                ) : (
                  <p className="mt-1 text-sm font-black leading-6 text-slate-900">
                    {report.location_name ||
                      "Barangay Tankulan, Manolo Fortich"}
                  </p>
                )}
              </div>
            </div>

            {hasCoordinates ? (
              <div className="mt-4 h-52 overflow-hidden rounded-2xl border border-slate-200">
                <MapContainer
                  center={[
                    report.latitude as number,
                    report.longitude as number,
                  ]}
                  zoom={16}
                  style={{
                    height:
                      "100%",
                    width:
                      "100%",
                  }}
                  zoomControl={
                    false
                  }
                  dragging={
                    false
                  }
                  scrollWheelZoom={
                    false
                  }
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
                    icon={
                      pinIcon
                    }
                  />
                </MapContainer>
              </div>
            ) : (
              <div className="mt-4 flex h-40 items-center justify-center rounded-2xl bg-slate-100 text-xs font-semibold text-slate-400">
                Location coordinates unavailable
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        ref={
          timelineRef
        }
        className="scroll-mt-24 overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm"
      >
        <div className="flex items-center gap-3 border-b border-violet-100 bg-violet-50 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-700 text-white">
            <FiClock
              size={19}
            />
          </div>

          <div>
            <h2 className="font-black text-slate-900">
              Report Progress
            </h2>

            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              Track what is happening with your report
            </p>
          </div>
        </div>

        <div className="p-6">
          {historyLoading ? (
            <p className="text-sm font-semibold text-slate-400">
              Loading report progress...
            </p>
          ) : (
            <div className="space-y-7">
              {timelineEvents.map(
                (
                  event,
                  index
                ) => {
                  const label =
                    getTimelineLabel(
                      event
                    );

                  const note =
                    getTimelineNote(
                      event
                    );

                  const isResolved =
                    label ===
                    "Resolved";

                  const isRejected =
                    label ===
                    "Rejected";

                  return (
                    <div
                      key={
                        event.id
                      }
                      className="relative pl-10"
                    >
                      {index <
                        timelineEvents.length -
                          1 && (
                        <span className="absolute bottom-[-28px] left-[9px] top-7 w-0.5 bg-violet-200" />
                      )}

                      <div
                        className={`absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full ring-4 ${
                          isResolved
                            ? "bg-emerald-600 ring-emerald-50"
                            : isRejected
                            ? "bg-rose-600 ring-rose-50"
                            : "bg-violet-600 ring-violet-50"
                        }`}
                      >
                        {(label ===
                          "Submitted" ||
                          label ===
                            "Assigned" ||
                          isResolved) && (
                          <FiCheck
                            size={11}
                            className="text-white"
                          />
                        )}
                      </div>

                      <p className="text-sm font-black text-slate-900">
                        {
                          label
                        }
                      </p>

                      <p className="mt-1 text-[11px] font-semibold text-slate-400">
                        {formatDateTime(
                          event.changed_at
                        )}
                      </p>

                      {note && (
                        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                          {
                            note
                          }
                        </p>
                      )}
                    </div>
                  );
                }
              )}

              {currentStatus !==
                "Resolved" &&
                currentStatus !==
                  "Rejected" && (
                  <div className="relative pl-10">
                    <span className="absolute left-[9px] top-0 h-5 w-0.5 bg-violet-200" />

                    <span className="absolute left-0 top-5 h-5 w-5 rounded-full border-2 border-slate-300 bg-white ring-4 ring-slate-50" />

                    <p className="pt-4 text-sm font-black text-slate-400">
                      Resolved
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Waiting for completion.
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <FiInfo
              size={17}
            />
          </div>

          <h2 className="font-black text-slate-900">
            Barangay Update
          </h2>
        </div>

        <div className="p-5">
          {currentStatus ===
            "Rejected" ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-3">
                <FiXCircle
                  className="mt-0.5 shrink-0 text-rose-600"
                  size={18}
                />

                <div>
                  <p className="text-xs font-black text-rose-800">
                    Report Rejected
                  </p>

                  <p className="mt-1 text-xs font-medium leading-5 text-rose-700">
                    {report.rejection_reason ||
                      "The barangay rejected this report."}
                  </p>
                </div>
              </div>
            </div>
          ) : report.remarks ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-black text-blue-800">
                Barangay Official Update
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-blue-900">
                {
                  report.remarks
                }
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <FiInfo
                  className="mt-0.5 shrink-0 text-blue-600"
                  size={18}
                />

                <div>
                  <p className="text-xs font-black text-blue-800">
                    No remarks yet.
                  </p>

                  <p className="mt-1 text-xs font-medium leading-5 text-blue-700">
                    You will see updates here once the barangay takes action on your report.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {currentStatus ===
        "Pending" && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={
                  handleSaveChanges
                }
                disabled={
                  saving
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3.5 text-xs font-black text-white transition hover:bg-emerald-800 disabled:opacity-50"
              >
                <FiCheckCircle
                  size={16}
                />

                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={
                  handleCancelEditing
                }
                disabled={
                  saving
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={
                handleStartEditing
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3.5 text-sm font-black text-white transition hover:bg-emerald-800"
            >
              <FiEdit3
                size={17}
              />
              Edit Report
            </button>
          )}

          <p className="mt-2 text-center text-[10px] font-semibold text-slate-400">
            You can edit this report while it is still Pending.
          </p>
        </section>
      )}

      {currentStatus ===
        "Ongoing" && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center text-xs font-semibold text-blue-800">
          Barangay personnel are already handling this report. Editing is no longer available.
        </div>
      )}

      {currentStatus ===
        "Resolved" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-xs font-semibold text-emerald-800">
          This waste report has been resolved.
        </div>
      )}

      <div className="text-center text-[10px] font-semibold text-slate-400">
        Submitted{" "}
        {formatDate(
          report.created_at
        )}
      </div>
    </div>
  );
}