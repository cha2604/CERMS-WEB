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
  FiCamera,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiInfo,
  FiMapPin,
  FiPrinter,
  FiRefreshCw,
  FiUser,
  FiUsers,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import exifr from "exifr";
import { supabase } from "../../lib/supabase";
import "leaflet/dist/leaflet.css";

interface ProfileData {
  full_name?: string | null;
  username?: string | null;
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
  return status === "On-going"
    ? "Ongoing"
    : status;
}

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return "—";
  }

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

function formatFileName(
  url: string,
  index: number
) {
  try {
    const parsed =
      new URL(url);

    const name =
      parsed.pathname
        .split("/")
        .pop();

    return (
      name ||
      `Photo ${index + 1}`
    );
  } catch {
    return `Photo ${index + 1}`;
  }
}

function getStatusBadgeClass(
  status: string
) {
  switch (
    normalizeStatus(status)
  ) {
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

function getSeverityClass(
  severity?: string | null
) {
  switch (
    (
      severity || ""
    ).toLowerCase()
  ) {
    case "high":
      return "bg-rose-50 text-rose-700 border-rose-200";

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
  const earthRadius =
    6371000;

  const dLat =
    ((lat2 - lat1) *
      Math.PI) /
    180;

  const dLng =
    ((lng2 - lng1) *
      Math.PI) /
    180;

  const a =
    Math.sin(
      dLat / 2
    ) **
      2 +
    Math.cos(
      (lat1 *
        Math.PI) /
        180
    ) *
      Math.cos(
        (lat2 *
          Math.PI) /
          180
      ) *
      Math.sin(
        dLng / 2
      ) **
        2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(
        1 - a
      )
    );

  return (
    earthRadius * c
  );
}

async function extractExifFromUrl(
  url: string
) {
  try {
    const response =
      await fetch(url);

    if (!response.ok) {
      return null;
    }

    const blob =
      await response.blob();

    const fileName =
      url
        .split("/")
        .pop() ||
      "photo.jpg";

    const file =
      new File(
        [blob],
        fileName,
        {
          type:
            blob.type ||
            "image/jpeg",
        }
      );

    const data =
      await exifr.parse(
        file,
        {
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
        }
      );

    if (!data) {
      return null;
    }

    const device =
      [
        data.Make,
        data.Model,
      ]
        .filter(Boolean)
        .join(" ") ||
      null;

    return {
      dateTaken:
        data.DateTimeOriginal
          ? new Date(
              data.DateTimeOriginal
            ).toISOString()
          : null,

      device,

      latitude:
        typeof data.latitude ===
        "number"
          ? data.latitude
          : null,

      longitude:
        typeof data.longitude ===
        "number"
          ? data.longitude
          : null,

      altitude:
        typeof data.GPSAltitude ===
        "number"
          ? data.GPSAltitude
          : null,

      imageWidth:
        data.ExifImageWidth ??
        data.PixelXDimension ??
        null,

      imageHeight:
        data.ExifImageHeight ??
        data.PixelYDimension ??
        null,
    } as ExifData;
  } catch {
    return null;
  }
}

export default function AdminReportDetails() {
  const { id } =
    useParams<{
      id: string;
    }>();

  const navigate =
    useNavigate();

  const [
    report,
    setReport,
  ] =
    useState<ReportDetail | null>(
      null
    );

  const [
    assignment,
    setAssignment,
  ] =
    useState<Assignment | null>(
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
    assignmentLoading,
    setAssignmentLoading,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    saveSuccess,
    setSaveSuccess,
  ] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    statusInput,
    setStatusInput,
  ] =
    useState("Pending");

  const [
    rejectionReason,
    setRejectionReason,
  ] =
    useState("");

  const [
    remarksInput,
    setRemarksInput,
  ] =
    useState("");

  const [
    teamName,
    setTeamName,
  ] =
    useState("");

  const [
    personnelNames,
    setPersonnelNames,
  ] =
    useState<
      string[]
    >([]);

  const [
    assignmentNotes,
    setAssignmentNotes,
  ] =
    useState("");

  const [
    selectedImageIndex,
    setSelectedImageIndex,
  ] =
    useState(0);

  const [
    selectedImage,
    setSelectedImage,
  ] =
    useState<
      string | null
    >(null);

  const [
    exifByImage,
    setExifByImage,
  ] =
    useState<
      Record<
        number,
        ExifData | null
      >
    >({});

  const loadHistory =
    async (
      reportId: string
    ) => {
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

      if (!error) {
        setHistory(
          (data ||
            []) as StatusHistory[]
        );
      }
    };

  const loadAssignment =
    async (
      reportId: string
    ) => {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "report_assignments"
          )
          .select(
            "id, report_id, team_name, personnel_name, notes, assigned_by, assigned_at"
          )
          .eq(
            "report_id",
            reportId
          )
          .maybeSingle();

      if (
        !error &&
        data
      ) {
        const currentAssignment =
          data as Assignment;

        setAssignment(
          currentAssignment
        );

        setTeamName(
          currentAssignment.team_name ||
            ""
        );

        setPersonnelNames(
          currentAssignment.personnel_name
            ? currentAssignment.personnel_name
                .split(
                  ", "
                )
                .filter(
                  Boolean
                )
            : []
        );

        setAssignmentNotes(
          currentAssignment.notes ||
            ""
        );
      }
    };

  useEffect(() => {
    async function fetchReportDetails() {
      if (!id) {
        return;
      }

      try {
        setLoading(
          true
        );

        setErrorMessage(
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
              "*, profiles(full_name, username, contact_number, email, address)"
            )
            .eq(
              "id",
              id
            )
            .single();

        if (error) {
          throw error;
        }

        const loadedReport =
          data as ReportDetail;

        setReport(
          loadedReport
        );

        setStatusInput(
          normalizeStatus(
            loadedReport.status
          )
        );

        setRejectionReason(
          loadedReport.rejection_reason ||
            ""
        );

        setRemarksInput(
          loadedReport.remarks ||
            ""
        );

        await Promise.all([
          loadAssignment(
            id
          ),
          loadHistory(id),
        ]);
      } catch (error) {
        console.error(
          "Failed to load report details:",
          error
        );

        setErrorMessage(
          error instanceof
            Error
            ? error.message
            : "Failed to load report details."
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
    const urls =
      report?.image_urls ||
      [];

    if (
      urls.length === 0
    ) {
      return;
    }

    let cancelled =
      false;

    async function loadExif() {
      const results =
        await Promise.all(
          urls
            .slice(0, 5)
            .map(
              async (
                url,
                index
              ) => {
                const exif =
                  await extractExifFromUrl(
                    url
                  );

                return [
                  index,
                  exif,
                ] as const;
              }
            )
        );

      if (cancelled) {
        return;
      }

      const next: Record<
        number,
        ExifData | null
      > = {};

      for (const [
        index,
        exif,
      ] of results) {
        next[index] =
          exif;
      }

      setExifByImage(
        next
      );
    }

    loadExif();

    return () => {
      cancelled =
        true;
    };
  }, [
    report?.image_urls,
  ]);

  const images =
    report?.image_urls ||
    [];

  const mainImage =
    images[
      selectedImageIndex
    ] || null;

  const selectedExif =
    exifByImage[
      selectedImageIndex
    ] || null;

  const timeline =
    useMemo(() => {
      const submittedEvent: StatusHistory =
        {
          id: `submitted-${
            report?.id ||
            "report"
          }`,

          report_id:
            report?.id ||
            "",

          status:
            "Submitted",

          note:
            "Report submitted by resident",

          changed_by:
            report?.user_id ||
            null,

          changed_at:
            report?.created_at ||
            new Date().toISOString(),
        };

      return [
        submittedEvent,
        ...history,
      ];
    }, [
      history,
      report,
    ]);

  const exifDifference =
    useMemo(() => {
      if (
        report?.latitude ===
          null ||
        report?.longitude ===
          null ||
        report?.latitude ===
          undefined ||
        report?.longitude ===
          undefined ||
        selectedExif?.latitude ===
          null ||
        selectedExif?.longitude ===
          null ||
        selectedExif?.latitude ===
          undefined ||
        selectedExif?.longitude ===
          undefined
      ) {
        return null;
      }

      return calculateDistanceMeters(
        report.latitude,
        report.longitude,
        selectedExif.latitude,
        selectedExif.longitude
      );
    }, [
      report,
      selectedExif,
    ]);

  const handleAssignTeam =
    async () => {
      if (!id) {
        return;
      }

      if (
        !teamName.trim() ||
        personnelNames.length ===
          0
      ) {
        setErrorMessage(
          "Please select the assigned team and at least one barangay personnel."
        );

        return;
      }

      try {
        setAssignmentLoading(
          true
        );

        setErrorMessage(
          ""
        );

        setSaveSuccess(
          ""
        );

        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "Your admin session could not be verified."
          );
        }

        const payload = {
          report_id:
            id,

          team_name:
            teamName.trim(),

          personnel_name:
            personnelNames.join(
              ", "
            ),

          notes:
            assignmentNotes.trim() ||
            null,

          assigned_by:
            user.id,

          assigned_at:
            new Date().toISOString(),
        };

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "report_assignments"
            )
            .upsert(
              payload,
              {
                onConflict:
                  "report_id",
              }
            )
            .select()
            .single();

        if (error) {
          throw error;
        }

        const {
          error:
            historyError,
        } =
          await supabase
            .from(
              "report_status_history"
            )
            .insert({
              report_id:
                id,

              status:
                normalizeStatus(
                  report?.status ||
                    statusInput
                ),

              note: `Assigned to ${teamName.trim()} - ${personnelNames.join(
                ", "
              )}`,

              changed_by:
                user.id,
            });

        if (
          historyError
        ) {
          throw historyError;
        }

        setAssignment(
          data as Assignment
        );

        await loadHistory(
          id
        );

        setSaveSuccess(
          "Response team assigned successfully."
        );
      } catch (error) {
        console.error(
          "Failed to assign response team:",
          error
        );

        setErrorMessage(
          error instanceof
            Error
            ? error.message
            : "Failed to assign response team."
        );
      } finally {
        setAssignmentLoading(
          false
        );
      }
    };

  const handleSaveChanges =
    async () => {
      if (
        !id ||
        !report
      ) {
        return;
      }

      try {
        setSaving(
          true
        );

        setSaveSuccess(
          ""
        );

        setErrorMessage(
          ""
        );

        if (
          statusInput ===
            "Rejected" &&
          !rejectionReason.trim()
        ) {
          throw new Error(
            "Please provide a reason for rejection."
          );
        }

        const previousStatus =
          normalizeStatus(
            report.status
          );

        const nextStatus =
          normalizeStatus(
            statusInput
          );

        const updateData: Record<
          string,
          unknown
        > = {
          status:
            nextStatus,

          remarks:
            remarksInput.trim() ||
            null,

          rejection_reason:
            nextStatus ===
            "Rejected"
              ? rejectionReason.trim()
              : null,

          updated_at:
            new Date().toISOString(),
        };

        const {
          error,
        } =
          await supabase
            .from(
              "reports"
            )
            .update(
              updateData
            )
            .eq(
              "id",
              id
            );

        if (error) {
          throw error;
        }

        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "Your admin session could not be verified."
          );
        }

        if (
          previousStatus !==
          nextStatus
        ) {
          const {
            error:
              historyError,
          } =
            await supabase
              .from(
                "report_status_history"
              )
              .insert({
                report_id:
                  id,

                status:
                  nextStatus,

                note:
                  nextStatus ===
                  "Rejected"
                    ? rejectionReason.trim()
                    : remarksInput.trim() ||
                      null,

                changed_by:
                  user.id,
              });

          if (
            historyError
          ) {
            throw historyError;
          }
        }

        const nextReport: ReportDetail =
          {
            ...report,

            status:
              nextStatus as ReportDetail["status"],

            remarks:
              remarksInput.trim() ||
              null,

            rejection_reason:
              nextStatus ===
              "Rejected"
                ? rejectionReason.trim()
                : null,

            updated_at:
              new Date().toISOString(),
          };

        setReport(
          nextReport
        );

        await loadHistory(
          id
        );

        navigate("/dashboard", {
          state: { saveSuccess: "Report details updated successfully." },
        });
      } catch (error) {
        console.error(
          "Failed to update report:",
          error
        );

        setErrorMessage(
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

  const handlePrint =
    () => {
      window.print();
    };

  const reporterName =
    report?.profiles
      ?.full_name ||
    "Unknown Resident";

  const reporterUsername =
    report?.profiles
      ?.username ||
    "Not provided";

  const reporterContact =
    report?.profiles
      ?.contact_number ||
    "Not provided";

  const reporterEmail =
    report?.profiles
      ?.email ||
    "Not provided";

  const reporterAddress =
    report?.profiles
      ?.address ||
    "Not provided";

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600">
          <FiXCircle
            size={24}
          />
        </div>

        <h2 className="text-xl font-black text-slate-800">
          Report Not Found
        </h2>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/reports"
            )
          }
          className="rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-900"
        >
          Back to Reports
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans print:bg-white">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/reports"
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
            >
              <FiArrowLeft
                size={18}
              />
            </button>

            <div>
              <h1 className="text-xl font-black text-slate-900">
                Report Details
              </h1>

              <p className="mt-0.5 font-mono text-[11px] font-bold text-slate-400">
                #
                {report.id.slice(
                  0,
                  8
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1.5 text-xs font-black ${getStatusBadgeClass(
                report.status
              )}`}
            >
              {normalizeStatus(
                report.status
              )}
            </span>

            <button
              type="button"
              onClick={
                handlePrint
              }
              className="flex items-center gap-2 rounded-xl border border-emerald-700 bg-white px-4 py-2.5 text-xs font-black text-emerald-800 transition hover:bg-emerald-50"
            >
              <FiPrinter
                size={15}
              />
              Print
            </button>
          </div>
        </div>
      </div>

      <main
        id="print-area"
        className="mx-auto max-w-[1500px] p-5 lg:p-7 print:max-w-none print:p-0"
      >
        <div className="mb-6 hidden border-b-2 border-emerald-800 pb-4 text-center print:block">
          <p className="text-xs font-black tracking-[0.18em] text-slate-500">
            REPUBLIC OF THE PHILIPPINES
          </p>

          <h1 className="mt-1 text-2xl font-black text-emerald-900">
            BARANGAY TANKULAN
          </h1>

          <p className="text-sm font-bold text-slate-700">
            WASTE INCIDENT REPORT
          </p>

          <p className="mt-1 text-[11px] text-slate-500">
            CERMS Official Report
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 print:hidden">
            {errorMessage}
          </div>
        )}

        {saveSuccess && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 print:hidden">
            <FiCheckCircle
              size={18}
            />
            {saveSuccess}
          </div>
        )}

        <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:shadow-none">
          <div className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-800 text-white">
                <FiFileText
                  size={24}
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-black text-slate-900">
                    Report #
                    {report.id.slice(
                      0,
                      8
                    )}
                  </h2>

                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-black ${getStatusBadgeClass(
                      report.status
                    )}`}
                  >
                    {normalizeStatus(
                      report.status
                    )}
                  </span>
                </div>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Submitted{" "}
                  {formatDateTime(
                    report.created_at
                  )}
                </p>
              </div>
            </div>

            <div className="border-slate-200 sm:border-l sm:pl-7">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Automated Severity
              </p>

              <span
                className={`mt-2 inline-flex rounded-full border px-4 py-1.5 text-sm font-black ${getSeverityClass(
                  report.severity
                )}`}
              >
                {report.severity ||
                  "Not assessed"}
              </span>

              <p className="mt-1 text-[10px] font-semibold text-slate-400">
                Detected automatically from resident photo
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:shadow-none">
              <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50/70 px-6 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-white">
                  <FiUser
                    size={17}
                  />
                </div>

                <h3 className="font-black text-slate-900">
                  Reporter Information
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Full Name
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-900">
                    {reporterName}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Username
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {reporterUsername}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Contact Number
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {reporterContact}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Email
                  </p>

                  <p className="mt-1 break-all text-sm font-bold text-slate-800">
                    {reporterEmail}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Area / Address
                  </p>

                  <p className="mt-1 text-sm font-bold leading-6 text-slate-800">
                    {reporterAddress}
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:shadow-none">
              <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50/70 px-6 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-white">
                  <FiFileText
                    size={17}
                  />
                </div>

                <h3 className="font-black text-slate-900">
                  Waste Issue
                </h3>
              </div>

              <div className="p-6">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Waste Type
                </p>

                <p className="mt-1 text-lg font-black text-slate-900">
                  {report.waste_type ||
                    report.category ||
                    report.title ||
                    "Waste Concern"}
                </p>

                <div className="mt-5 border-t border-slate-100 pt-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Description
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                    {report.description ||
                      "No description was provided by the resident."}
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:shadow-none">
              <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50/70 px-6 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-white">
                  <FiMapPin
                    size={18}
                  />
                </div>

                <h3 className="font-black text-slate-900">
                  Location
                </h3>
              </div>

              <div className="p-6">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Report Location
                </p>

                <p className="mt-1 text-sm font-black leading-6 text-slate-900">
                  {report.location_name ||
                    "Location address unavailable"}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[9px] font-black uppercase text-slate-400">
                      Latitude
                    </p>

                    <p className="mt-1 font-mono text-xs font-bold text-slate-800">
                      {report.latitude !==
                      null
                        ? report.latitude.toFixed(
                            6
                          )
                        : "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[9px] font-black uppercase text-slate-400">
                      Longitude
                    </p>

                    <p className="mt-1 font-mono text-xs font-bold text-slate-800">
                      {report.longitude !==
                      null
                        ? report.longitude.toFixed(
                            6
                          )
                        : "—"}
                    </p>
                  </div>
                </div>

                {typeof report.latitude ===
                  "number" &&
                typeof report.longitude ===
                  "number" ? (
                  <div className="mt-5 h-[300px] overflow-hidden rounded-2xl border border-slate-200 print:hidden">
                    <MapContainer
                      center={[
                        report.latitude,
                        report.longitude,
                      ]}
                      zoom={17}
                      scrollWheelZoom={
                        false
                      }
                      style={{
                        height:
                          "100%",
                        width:
                          "100%",
                      }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      <CircleMarker
                        center={[
                          report.latitude,
                          report.longitude,
                        ]}
                        radius={12}
                        pathOptions={{
                          color:
                            "#ffffff",
                          fillColor:
                            "#dc2626",
                          fillOpacity:
                            1,
                          weight:
                            3,
                        }}
                      >
                        <Popup>
                          <div className="w-56 p-1">
                            <p className="text-[10px] font-black uppercase text-red-600">
                              Waste Report Location
                            </p>

                            <p className="mt-1 text-xs font-bold text-slate-900">
                              {report.location_name ||
                                "Barangay Tankulan, Manolo Fortich, Bukidnon"}
                            </p>
                          </div>
                        </Popup>
                      </CircleMarker>
                    </MapContainer>
                  </div>
                ) : (
                  <div className="mt-5 flex h-40 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-400 print:hidden">
                    No coordinates available.
                  </div>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:shadow-none">
              <div className="flex items-center gap-3 border-b border-violet-100 bg-violet-50/70 px-6 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-700 text-white">
                  <FiClock
                    size={17}
                  />
                </div>

                <h3 className="font-black text-slate-900">
                  Report Timeline
                </h3>
              </div>

              <div className="p-6">
                <div className="space-y-5">
                  {timeline.map(
                    (
                      event,
                      index
                    ) => (
                      <div
                        key={
                          event.id
                        }
                        className="relative pl-8"
                      >
                        {index <
                          timeline.length -
                            1 && (
                          <span className="absolute bottom-[-20px] left-[7px] top-5 w-px bg-slate-200" />
                        )}

                        <span className="absolute left-0 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 ring-4 ring-violet-50" />

                        <p className="text-xs font-black text-slate-900">
                          {event.status}
                        </p>

                        <p className="mt-1 text-[10px] font-semibold text-slate-400">
                          {formatDateTime(
                            event.changed_at
                          )}
                        </p>

                        {event.note && (
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {
                              event.note
                            }
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:shadow-none">
              <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-white">
                    <FiCamera
                      size={17}
                    />
                  </div>

                  <h3 className="font-black text-slate-900">
                    Photo Evidence
                  </h3>
                </div>

                <span className="text-[10px] font-black text-slate-400">
                  {images.length}{" "}
                  PHOTO
                  {images.length !==
                  1
                    ? "S"
                    : ""}
                </span>
              </div>

              <div className="p-5">
                {images.length >
                0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImage(
                          mainImage
                        )
                      }
                      className="block w-full overflow-hidden rounded-2xl bg-slate-100 print:hidden"
                    >
                      {mainImage && (
                        <img
                          src={
                            mainImage
                          }
                          alt="Waste evidence"
                          className="h-[340px] w-full object-cover"
                        />
                      )}
                    </button>

                    <div className="hidden print:block">
                      {mainImage && (
                        <img
                          src={
                            mainImage
                          }
                          alt="Waste evidence"
                          className="max-h-[400px] w-full rounded-xl object-contain"
                        />
                      )}
                    </div>

                    {images.length >
                      1 && (
                      <div className="mt-3 grid grid-cols-5 gap-2 print:hidden">
                        {images
                          .slice(
                            0,
                            5
                          )
                          .map(
                            (
                              url,
                              index
                            ) => (
                              <button
                                key={`${url}-${index}`}
                                type="button"
                                onClick={() =>
                                  setSelectedImageIndex(
                                    index
                                  )
                                }
                                className={`h-16 overflow-hidden rounded-xl border-2 ${
                                  index ===
                                  selectedImageIndex
                                    ? "border-emerald-700"
                                    : "border-slate-200"
                                }`}
                              >
                                <img
                                  src={
                                    url
                                  }
                                  alt={`Evidence ${
                                    index +
                                    1
                                  }`}
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            )
                          )}
                      </div>
                    )}

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 print:hidden">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-400">
                            Selected Photo
                          </p>

                          <p className="mt-1 break-all text-[11px] font-bold text-slate-700">
                            {formatFileName(
                              mainImage ||
                                "",
                              selectedImageIndex
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-400">
                            Date Taken
                          </p>

                          <p className="mt-1 text-[11px] font-bold text-slate-700">
                            {selectedExif?.dateTaken
                              ? formatDateTime(
                                  selectedExif.dateTaken
                                )
                              : "Not available"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-400">
                            Device
                          </p>

                          <p className="mt-1 text-[11px] font-bold text-slate-700">
                            {selectedExif?.device ||
                              "Not available"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-400">
                            Dimensions
                          </p>

                          <p className="mt-1 text-[11px] font-bold text-slate-700">
                            {selectedExif?.imageWidth &&
                            selectedExif?.imageHeight
                              ? `${selectedExif.imageWidth} × ${selectedExif.imageHeight}`
                              : "Not available"}
                          </p>
                        </div>
                      </div>

                      {exifDifference !==
                        null && (
                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
                          <p className="text-[9px] font-black uppercase text-blue-700">
                            Photo GPS vs Report Pin
                          </p>

                          <p className="mt-1 text-xs font-black text-blue-900">
                            {exifDifference <
                            1000
                              ? `${Math.round(
                                  exifDifference
                                )} meters apart`
                              : `${(
                                  exifDifference /
                                  1000
                                ).toFixed(
                                  2
                                )} km apart`}
                          </p>
                        </div>
                      )}

                      <div className="mt-3 flex items-start gap-2 text-[10px] font-semibold text-slate-400">
                        <FiInfo
                          size={13}
                          className="mt-0.5 shrink-0"
                        />
                        EXIF information depends on whether the captured image retained its metadata.
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs font-semibold text-slate-400">
                    No evidence photos available.
                  </div>
                )}
              </div>
            </section>

            <section
              className={`rounded-3xl border p-5 ${getSeverityClass(
                report.severity
              )}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70">
                  <FiCheckCircle
                    size={20}
                  />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-70">
                    Automated Severity Assessment
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {report.severity ||
                      "Not assessed"}
                  </p>

                  <p className="mt-2 text-xs font-semibold leading-5 opacity-80">
                    Severity was automatically detected from the resident's captured waste photo.
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:shadow-none">
              <div className="border-b border-slate-100 px-6 py-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Report Status
                </p>

                <h3 className="mt-1 font-black text-slate-900">
                  Update Case Status
                </h3>
              </div>

              <div className="space-y-4 p-6 print:hidden">
                <select
                  value={
                    statusInput
                  }
                  onChange={(event) =>
                    setStatusInput(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700/20"
                >
                  {STATUS_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }{" "}
                        —{" "}
                        {
                          option.helper
                        }
                      </option>
                    )
                  )}
                </select>

                {statusInput ===
                  "Rejected" && (
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-rose-700">
                      Rejection Reason
                    </label>

                    <textarea
                      rows={3}
                      value={
                        rejectionReason
                      }
                      onChange={(event) =>
                        setRejectionReason(
                          event.target.value
                        )
                      }
                      placeholder="Enter reason for rejecting this report"
                      className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="hidden p-6 text-xs print:block">
                <p className="font-black text-slate-900">
                  {normalizeStatus(
                    report.status
                  )}
                </p>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:shadow-none">
              <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-white">
                    <FiUsers
                      size={17}
                    />
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900">
                      Assign Response Team
                    </h3>

                    <p className="text-[10px] font-semibold text-slate-500">
                      Assign barangay personnel to this report
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6 print:hidden">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Assigned Team
                  </label>

                  <select
                    value={
                      teamName
                    }
                    onChange={(event) => {
                      const nextTeam =
                        event
                          .target
                          .value;

                      setTeamName(
                        nextTeam
                      );

                      const selectedTeam =
                        BARANGAY_RESPONSE_TEAMS.find(
                          (
                            team
                          ) =>
                            team.name ===
                            nextTeam
                        );

                      setPersonnelNames(
                        selectedTeam
                          ? [
                              ...selectedTeam.personnel,
                            ]
                          : []
                      );
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700/20"
                  >
                    <option value="">
                      Select response team
                    </option>

                    {BARANGAY_RESPONSE_TEAMS.map(
                      (
                        team
                      ) => (
                        <option
                          key={
                            team.name
                          }
                          value={
                            team.name
                          }
                        >
                          {
                            team.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Assigned Personnel
                  </label>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    {teamName ? (
                      BARANGAY_RESPONSE_TEAMS.find(
                        (
                          team
                        ) =>
                          team.name ===
                          teamName
                      )?.personnel.map(
                        (
                          person
                        ) => (
                          <label
                            key={
                              person
                            }
                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                          >
                            <input
                              type="checkbox"
                              checked={personnelNames.includes(
                                person
                              )}
                              onChange={(event) => {
                                if (
                                  event
                                    .target
                                    .checked
                                ) {
                                  setPersonnelNames(
                                    (
                                      current
                                    ) =>
                                      current.includes(
                                        person
                                      )
                                        ? current
                                        : [
                                            ...current,
                                            person,
                                          ]
                                  );
                                } else {
                                  setPersonnelNames(
                                    (
                                      current
                                    ) =>
                                      current.filter(
                                        (
                                          name
                                        ) =>
                                          name !==
                                          person
                                      )
                                  );
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                            />

                            <span className="text-xs font-bold text-slate-800">
                              {
                                person
                              }
                            </span>
                          </label>
                        )
                      )
                    ) : (
                      <p className="px-1 py-2 text-xs font-semibold text-slate-400">
                        Select a response team first.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Assignment Notes
                  </label>

                  <textarea
                    rows={3}
                    value={
                      assignmentNotes
                    }
                    onChange={(event) =>
                      setAssignmentNotes(
                        event.target.value
                      )
                    }
                    placeholder="Example: Inspect the reported area and coordinate waste collection."
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>

                {assignment && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                        <FiCheck
                          size={14}
                        />
                      </div>

                      <div>
                        <p className="text-xs font-black text-emerald-900">
                          Currently Assigned
                        </p>

                        <p className="mt-1 text-xs font-bold text-emerald-800">
                          {
                            assignment.team_name
                          }
                        </p>

                        <p className="mt-0.5 text-xs text-emerald-700">
                          {
                            assignment.personnel_name
                          }
                        </p>

                        <p className="mt-2 text-[10px] font-semibold text-emerald-700">
                          Assigned{" "}
                          {formatDateTime(
                            assignment.assigned_at
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={
                    handleAssignTeam
                  }
                  disabled={
                    assignmentLoading
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  <FiUsers
                    size={15}
                  />

                  {assignmentLoading
                    ? "Assigning..."
                    : assignment
                    ? "Update Assignment"
                    : "Assign Team"}
                </button>
              </div>

              <div className="hidden p-6 text-xs print:block">
                <p className="text-[9px] font-black uppercase text-slate-400">
                  Assigned Team
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {assignment?.team_name ||
                    "Not assigned"}
                </p>

                <p className="mt-4 text-[9px] font-black uppercase text-slate-400">
                  Personnel
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {assignment?.personnel_name ||
                    "Not assigned"}
                </p>

                <p className="mt-4 text-[9px] font-black uppercase text-slate-400">
                  Assignment Notes
                </p>

                <p className="mt-1 text-slate-800">
                  {assignment?.notes ||
                    "—"}
                </p>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:shadow-none">
              <div className="border-b border-emerald-100 bg-emerald-50/70 px-6 py-4">
                <h3 className="font-black text-slate-900">
                  Admin Remarks / Action
                </h3>

                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                  Record the action taken by Barangay Tankulan
                </p>
              </div>

              <div className="space-y-4 p-6 print:hidden">
                <textarea
                  rows={5}
                  value={
                    remarksInput
                  }
                  onChange={(event) =>
                    setRemarksInput(
                      event.target.value
                    )
                  }
                  maxLength={500}
                  placeholder="Example: Barangay personnel inspected the location and scheduled the waste for collection."
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700/20"
                />

                <div className="flex justify-end">
                  <span className="text-[10px] font-semibold text-slate-400">
                    {
                      remarksInput.length
                    }
                    /500
                  </span>
                </div>

                <button
                  type="button"
                  onClick={
                    handleSaveChanges
                  }
                  disabled={
                    saving
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  <FiCheckCircle
                    size={16}
                  />

                  {saving
                    ? "Updating Report..."
                    : "Update Report"}
                </button>
              </div>

              <div className="hidden p-6 text-xs print:block">
                <p className="text-[9px] font-black uppercase text-slate-400">
                  Remarks
                </p>

                <p className="mt-2 whitespace-pre-wrap text-slate-800">
                  {report.remarks ||
                    "—"}
                </p>

                {report.rejection_reason && (
                  <>
                    <p className="mt-4 text-[9px] font-black uppercase text-rose-600">
                      Rejection Reason
                    </p>

                    <p className="mt-1 text-rose-800">
                      {
                        report.rejection_reason
                      }
                    </p>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>

        <section className="mt-8 hidden border-t-2 border-slate-300 pt-5 print:block print:break-inside-avoid">
          <div className="grid grid-cols-2 gap-10 text-xs">
            <div>
              <p className="font-black uppercase tracking-wider text-slate-500">
                Prepared by
              </p>

              <div className="mt-8 h-12 border-b border-slate-400" />

              <p className="mt-2 font-bold text-slate-800">
                Barangay Personnel
              </p>
            </div>

            <div>
              <p className="font-black uppercase tracking-wider text-slate-500">
                Reviewed by
              </p>

              <div className="mt-8 h-12 border-b border-slate-400" />

              <p className="mt-2 font-bold text-slate-800">
                Barangay Official
              </p>
            </div>
          </div>
        </section>
      </main>

      {selectedImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md print:hidden"
          onClick={() =>
            setSelectedImage(
              null
            )
          }
        >
          <button
            type="button"
            onClick={() =>
              setSelectedImage(
                null
              )
            }
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <FiX />
          </button>

          <img
            src={
              selectedImage
            }
            alt="Waste evidence"
            className="max-h-[92vh] max-w-[95vw] rounded-2xl object-contain shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          />
        </div>
      )}
    </div>
  );
}