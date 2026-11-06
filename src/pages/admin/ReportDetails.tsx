import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
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

interface StaffPersonnel {
  id: string;
  full_name: string;
  username: string;
  email: string;
  contact_number: string | null;
  team_name: string;
  position: string | null;
  account_status: "Active" | "Inactive";
}

interface Assignment {
  id: string;
  report_id: string;
  staff_id: string | null;
  team_name: string;
  personnel_name: string;
  notes: string | null;
  assigned_by: string | null;
  assigned_at: string;
  assignment_status: string | null;
}

interface StatusHistory {
  id: string;
  report_id: string;
  status: string;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
}

interface ReportCompletion {
  id: string;
  report_id: string;
  assignment_id: string;
  staff_id: string;
  action_taken: string;
  proof_image_url: string;
  verification_status: string;
  verification_note: string | null;
  submitted_at: string;
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
    value: "Rejected",
    label: "Rejected",
    helper: "Invalid, duplicate, or unsupported report",
  },
] as const;

function normalizeStatus(
  status: string
) {
  return status ===
    "On-going"
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

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "—";
  }

  return new Date(
    value
  ).toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
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
    return `Photo ${
      index + 1
    }`;
  }
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
      severity ||
      ""
    ).toLowerCase()
  ) {
    case "critical":
      return "bg-red-50 text-red-800 border-red-200";

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
    earthRadius *
    c
  );
}

async function extractExifFromUrl(
  url: string
) {
  try {
    const response =
      await fetch(url);

    if (
      !response.ok
    ) {
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
        .filter(
          Boolean
        )
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
    useState<StatusHistory[]>(
      []
    );

  const [
    completions,
    setCompletions,
  ] =
    useState<ReportCompletion[]>(
      []
    );

  const [
    staffPersonnel,
    setStaffPersonnel,
  ] =
    useState<StaffPersonnel[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    staffLoading,
    setStaffLoading,
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
    verificationLoading,
    setVerificationLoading,
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
    useState(
      "Pending"
    );

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
    selectedStaffId,
    setSelectedStaffId,
  ] =
    useState("");

  const [
    assignmentNotes,
    setAssignmentNotes,
  ] =
    useState("");

  const [
    returnNote,
    setReturnNote,
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
    useState<string | null>(
      null
    );

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

  const loadCompletions =
    async (
      reportId: string
    ) => {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "report_completions"
          )
          .select(
            "id, report_id, assignment_id, staff_id, action_taken, proof_image_url, verification_status, verification_note, submitted_at"
          )
          .eq(
            "report_id",
            reportId
          )
          .order(
            "submitted_at",
            {
              ascending:
                false,
            }
          );

      if (error) {
        console.error(
          "Failed to load completions:",
          error
        );

        return;
      }

      setCompletions(
        (data ||
          []) as ReportCompletion[]
      );
    };

  const loadStaffPersonnel =
    async () => {
      try {
        setStaffLoading(
          true
        );

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "staff_profiles"
            )
            .select(
              "id, full_name, username, email, contact_number, team_name, position, account_status"
            )
            .order(
              "full_name",
              {
                ascending:
                  true,
              }
            );

        if (error) {
          throw error;
        }

        setStaffPersonnel(
          (data ||
            []) as StaffPersonnel[]
        );
      } catch (
        staffError
      ) {
        console.error(
          "Failed to load staff personnel:",
          staffError
        );

        setErrorMessage(
          staffError instanceof
            Error
            ? staffError.message
            : "Failed to load staff personnel."
        );
      } finally {
        setStaffLoading(
          false
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
            "id, report_id, staff_id, team_name, personnel_name, notes, assigned_by, assigned_at, assignment_status"
          )
          .eq(
            "report_id",
            reportId
          )
          .maybeSingle();

      if (error) {
        console.error(
          "Failed to load assignment:",
          error
        );

        return;
      }

      if (data) {
        const currentAssignment =
          data as Assignment;

        setAssignment(
          currentAssignment
        );

        setTeamName(
          currentAssignment.team_name ||
            ""
        );

        setSelectedStaffId(
          currentAssignment.staff_id ||
            ""
        );

        setAssignmentNotes(
          currentAssignment.notes ||
            ""
        );
      } else {
        setAssignment(
          null
        );
      }
    };

  const refreshReport =
    async () => {
      if (!id) {
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
          .select(
            "*, profiles(full_name, contact_number, email, address)"
          )
          .eq(
            "id",
            id
          )
          .single();

      if (
        !error &&
        data
      ) {
        const loaded =
          data as ReportDetail;

        setReport(
          loaded
        );

        setStatusInput(
          normalizeStatus(
            loaded.status
          )
        );

        setRejectionReason(
          loaded.rejection_reason ||
            ""
        );

        setRemarksInput(
          loaded.remarks ||
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

        await refreshReport();

        await Promise.all([
          loadAssignment(
            id
          ),
          loadHistory(
            id
          ),
          loadStaffPersonnel(),
          loadCompletions(
            id
          ),
        ]);
      } catch (
        loadError
      ) {
        console.error(
          "Failed to load report details:",
          loadError
        );

        setErrorMessage(
          loadError instanceof
            Error
            ? loadError.message
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
    if (!id) {
      return;
    }

    const channel =
      supabase
        .channel(
          `admin-report-${id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "staff_profiles",
          },
          () => {
            loadStaffPersonnel();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "report_assignments",
            filter: `report_id=eq.${id}`,
          },
          () => {
            loadAssignment(
              id
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "report_completions",
            filter: `report_id=eq.${id}`,
          },
          () => {
            loadCompletions(
              id
            );
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
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
            .slice(
              0,
              5
            )
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

      if (
        cancelled
      ) {
        return;
      }

      const next: Record<
        number,
        ExifData | null
      > = {};

      for (
        const [
          index,
          exif,
        ] of results
      ) {
        next[
          index
        ] = exif;
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
    ] ||
    null;

  const selectedExif =
    exifByImage[
      selectedImageIndex
    ] ||
    null;

  const availableTeams =
    useMemo(() => {
      return Array.from(
        new Set(
          staffPersonnel
            .map(
              (
                staff
              ) =>
                staff.team_name?.trim()
            )
            .filter(
              (
                team
              ): team is string =>
                Boolean(
                  team
                )
            )
        )
      ).sort();
    }, [
      staffPersonnel,
    ]);

  const teamPersonnel =
    useMemo(() => {
      if (
        !teamName
      ) {
        return [];
      }

      return staffPersonnel.filter(
        (
          staff
        ) =>
          staff.team_name ===
          teamName
      );
    }, [
      staffPersonnel,
      teamName,
    ]);

  const selectedStaff =
    useMemo(() => {
      return (
        staffPersonnel.find(
          (
            staff
          ) =>
            staff.id ===
            selectedStaffId
        ) ||
        null
      );
    }, [
      staffPersonnel,
      selectedStaffId,
    ]);

  const activeTeamPersonnel =
    useMemo(() => {
      return teamPersonnel.filter(
        (
          staff
        ) =>
          staff.account_status ===
          "Active"
      );
    }, [
      teamPersonnel,
    ]);

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

  const handleTeamChange =
    (
      nextTeam: string
    ) => {
      setTeamName(
        nextTeam
      );

      if (
        assignment?.staff_id &&
        assignment.team_name ===
          nextTeam
      ) {
        setSelectedStaffId(
          assignment.staff_id
        );
      } else {
        setSelectedStaffId(
          ""
        );
      }
    };

  const handlePersonnelSelect =
    (
      staff: StaffPersonnel
    ) => {
      if (
        staff.account_status !==
        "Active"
      ) {
        return;
      }

      setSelectedStaffId(
        staff.id
      );
    };

  const handleAssignTeam =
    async () => {
      if (!id) {
        return;
      }

      if (
        !teamName
      ) {
        setErrorMessage(
          "Please select a response team."
        );

        return;
      }

      if (
        !selectedStaff
      ) {
        setErrorMessage(
          "Please select an active staff member."
        );

        return;
      }

      if (
        selectedStaff.account_status !==
        "Active"
      ) {
        setErrorMessage(
          "Inactive staff accounts cannot be assigned."
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

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "report_assignments"
            )
            .upsert(
              {
                report_id:
                  id,
                staff_id:
                  selectedStaff.id,
                team_name:
                  selectedStaff.team_name,
                personnel_name:
                  selectedStaff.full_name,
                notes:
                  assignmentNotes.trim() ||
                  null,
                assigned_by:
                  user.id,
                assigned_at:
                  new Date().toISOString(),
                assignment_status:
                  "Assigned",
              },
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

        setAssignment(
          data as Assignment
        );

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
                  "Pending"
              ),
            note:
              `Assigned to ${selectedStaff.team_name} - ${selectedStaff.full_name}`,
            changed_by:
              user.id,
          });

        await loadHistory(
          id
        );

        setSaveSuccess(
          `${selectedStaff.full_name} has been assigned successfully.`
        );
      } catch (
        assignError
      ) {
        console.error(
          "Failed to assign response team:",
          assignError
        );

        setErrorMessage(
          assignError instanceof
            Error
            ? assignError.message
            : "Failed to assign response team."
        );
      } finally {
        setAssignmentLoading(
          false
        );
      }
    };

  const confirmResolution =
    async (
      completionId: string
    ) => {
      if (!id) {
        return;
      }

      try {
        setVerificationLoading(
          true
        );

        setErrorMessage(
          ""
        );

        setSaveSuccess(
          ""
        );

        const {
          error,
        } =
          await supabase.rpc(
            "admin_verify_completion",
            {
              p_completion_id:
                completionId,
            }
          );

        if (error) {
          throw error;
        }

        setSaveSuccess(
          "Resolution confirmed. The report is now officially Resolved."
        );

        await Promise.all([
          refreshReport(),
          loadAssignment(
            id
          ),
          loadHistory(
            id
          ),
          loadCompletions(
            id
          ),
        ]);
      } catch (
        confirmError
      ) {
        console.error(
          "Failed to confirm resolution:",
          confirmError
        );

        setErrorMessage(
          confirmError instanceof
            Error
            ? confirmError.message
            : "Unable to confirm resolution."
        );
      } finally {
        setVerificationLoading(
          false
        );
      }
    };

  const returnForAction =
    async (
      completionId: string
    ) => {
      if (!id) {
        return;
      }

      if (
        !returnNote.trim()
      ) {
        setErrorMessage(
          "Please provide a reason for returning this completion."
        );

        return;
      }

      try {
        setVerificationLoading(
          true
        );

        setErrorMessage(
          ""
        );

        setSaveSuccess(
          ""
        );

        const {
          error,
        } =
          await supabase.rpc(
            "admin_return_completion",
            {
              p_completion_id:
                completionId,
              p_verification_note:
                returnNote.trim(),
            }
          );

        if (error) {
          throw error;
        }

        setReturnNote(
          ""
        );

        setSaveSuccess(
          "The completion was returned to the staff for additional action."
        );

        await Promise.all([
          refreshReport(),
          loadAssignment(
            id
          ),
          loadHistory(
            id
          ),
          loadCompletions(
            id
          ),
        ]);
      } catch (
        returnError
      ) {
        console.error(
          "Failed to return completion:",
          returnError
        );

        setErrorMessage(
          returnError instanceof
            Error
            ? returnError.message
            : "Unable to return completion."
        );
      } finally {
        setVerificationLoading(
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

        setErrorMessage(
          ""
        );

        setSaveSuccess(
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

        const {
          error,
        } =
          await supabase
            .from(
              "reports"
            )
            .update({
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
            })
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

        if (
          previousStatus !==
            nextStatus &&
          user
        ) {
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
        }

        await Promise.all([
          refreshReport(),
          loadHistory(
            id
          ),
        ]);

        setSaveSuccess(
          "Report details updated successfully."
        );
      } catch (
        saveError
      ) {
        console.error(
          "Failed to update report:",
          saveError
        );

        setErrorMessage(
          saveError instanceof
            Error
            ? saveError.message
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
        <FiXCircle
          size={30}
          className="text-rose-600"
        />

        <h2 className="text-xl font-black text-slate-800">
          Report Not Found
        </h2>
      </div>
    );
  }

  const reporterName =
    report.profiles
      ?.full_name ||
    "Unknown Resident";

  const reporterContact =
    report.profiles
      ?.contact_number ||
    "Not provided";

  const reporterEmail =
    report.profiles
      ?.email ||
    "Not provided";

  const reporterAddress =
    report.profiles
      ?.address ||
    "Not provided";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/reports"
              )
            }
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700"
          >
            <FiArrowLeft />
            Back to Reports
          </button>

          <div className="flex items-center gap-3">
            <span
              className={`rounded-xl border px-4 py-2 text-xs font-black ${getStatusBadgeClass(
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
              className="flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-black text-white"
            >
              <FiPrinter />
              Print
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1500px] space-y-6 p-6 lg:p-8">
        {errorMessage && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {errorMessage}
          </div>
        )}

        {saveSuccess && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {saveSuccess}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                Waste Concern
              </p>

              <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">
                    {report.waste_type ||
                      report.title ||
                      "Waste Report"}
                  </h1>

                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Submitted{" "}
                    {formatDateTime(
                      report.created_at
                    )}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-black ${getSeverityClass(
                    report.severity
                  )}`}
                >
                  Severity:{" "}
                  {report.severity ||
                    "Not assessed"}
                </span>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase text-slate-400">
                  Description
                </p>

                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {report.description ||
                    "No description provided."}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-red-600">
                    Geotagged Location
                  </p>

                  <h2 className="mt-1 font-black text-slate-900">
                    Report Location
                  </h2>
                </div>

                <FiMapPin className="text-red-600" />
              </div>

              <p className="mt-4 text-sm font-bold text-slate-800">
                {report.location_name ||
                  "Location unavailable"}
              </p>

              {typeof report.latitude ===
                "number" &&
              typeof report.longitude ===
                "number" && (
                <div className="mt-4 h-[360px] overflow-hidden rounded-2xl border border-slate-200">
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
                      width:
                        "100%",
                      height:
                        "100%",
                    }}
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <CircleMarker
                      center={[
                        report.latitude,
                        report.longitude,
                      ]}
                      radius={12}
                    >
                      <Popup>
                        {
                          report.location_name
                        }
                      </Popup>
                    </CircleMarker>
                  </MapContainer>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-black text-slate-900">
                Submitted Photos
              </h2>

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
                    className="mt-4 block w-full overflow-hidden rounded-2xl"
                  >
                    <img
                      src={
                        mainImage ||
                        ""
                      }
                      alt="Evidence"
                      className="h-[360px] w-full object-contain bg-slate-900"
                    />
                  </button>

                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {images
                      .slice(
                        0,
                        5
                      )
                      .map(
                        (
                          image,
                          index
                        ) => (
                          <button
                            type="button"
                            key={
                              image
                            }
                            onClick={() =>
                              setSelectedImageIndex(
                                index
                              )
                            }
                            className={`overflow-hidden rounded-xl border-2 ${
                              selectedImageIndex ===
                              index
                                ? "border-emerald-700"
                                : "border-slate-200"
                            }`}
                          >
                            <img
                              src={
                                image
                              }
                              className="h-16 w-full object-cover"
                            />
                          </button>
                        )
                      )}
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase text-slate-400">
                      Selected Photo
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-700">
                      {formatFileName(
                        mainImage ||
                          "",
                        selectedImageIndex
                      )}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="font-black text-slate-400">
                          Date Taken
                        </p>

                        <p className="mt-1 font-semibold text-slate-700">
                          {selectedExif?.dateTaken
                            ? formatDateTime(
                                selectedExif.dateTaken
                              )
                            : "Not available"}
                        </p>
                      </div>

                      <div>
                        <p className="font-black text-slate-400">
                          Device
                        </p>

                        <p className="mt-1 font-semibold text-slate-700">
                          {selectedExif?.device ||
                            "Not available"}
                        </p>
                      </div>
                    </div>

                    {exifDifference !==
                      null && (
                      <div className="mt-4 rounded-xl bg-blue-50 p-3">
                        <p className="text-xs font-black text-blue-800">
                          Photo GPS is{" "}
                          {Math.round(
                            exifDifference
                          )}{" "}
                          meters from the report pin.
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                      <FiInfo />
                      EXIF metadata depends on the uploaded photo.
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
                  No evidence photos.
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-black text-slate-900">
                Resident Information
              </h2>

              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    Full Name
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {
                      reporterName
                    }
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    Contact
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {
                      reporterContact
                    }
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    Email
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {
                      reporterEmail
                    }
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    Address
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {
                      reporterAddress
                    }
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    Submitted
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {formatDate(
                      report.created_at
                    )}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-200 bg-white shadow-sm">
              <div className="rounded-t-3xl bg-emerald-50 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                      Response Assignment
                    </p>

                    <h2 className="mt-1 font-black text-slate-900">
                      Assign Personnel
                    </h2>
                  </div>

                  <FiUsers className="text-emerald-700" />
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Assigned Team
                  </label>

                  <select
                    value={
                      teamName
                    }
                    onChange={(
                      event
                    ) =>
                      handleTeamChange(
                        event
                          .target
                          .value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"
                  >
                    <option value="">
                      Select Team
                    </option>

                    {availableTeams.map(
                      (
                        team
                      ) => (
                        <option
                          key={
                            team
                          }
                          value={
                            team
                          }
                        >
                          {
                            team
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Assigned Personnel
                  </label>

                  <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3">
                    {staffLoading ? (
                      <p className="text-xs text-slate-400">
                        Loading personnel...
                      </p>
                    ) : !teamName ? (
                      <p className="text-xs text-slate-400">
                        Select a team first.
                      </p>
                    ) : teamPersonnel.length ===
                      0 ? (
                      <p className="text-xs text-slate-400">
                        No personnel under this team.
                      </p>
                    ) : (
                      teamPersonnel.map(
                        (
                          staff
                        ) => {
                          const active =
                            staff.account_status ===
                            "Active";

                          const selected =
                            staff.id ===
                            selectedStaffId;

                          return (
                            <button
                              type="button"
                              key={
                                staff.id
                              }
                              disabled={
                                !active
                              }
                              onClick={() =>
                                handlePersonnelSelect(
                                  staff
                                )
                              }
                              className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${
                                selected
                                  ? "border-emerald-500 bg-emerald-50"
                                  : active
                                  ? "border-slate-200 bg-white"
                                  : "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"
                              }`}
                            >
                              <div>
                                <p className="text-sm font-black text-slate-800">
                                  {
                                    staff.full_name
                                  }
                                </p>

                                <p className="text-[10px] text-slate-500">
                                  {staff.position ||
                                    "Personnel"}{" "}
                                  • @
                                  {
                                    staff.username
                                  }
                                </p>
                              </div>

                              <span
                                className={`rounded-full px-3 py-1 text-[10px] font-black ${
                                  active
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-200 text-slate-500"
                                }`}
                              >
                                {
                                  staff.account_status
                                }
                              </span>
                            </button>
                          );
                        }
                      )
                    )}
                  </div>

                  {teamName &&
                    activeTeamPersonnel.length ===
                      0 &&
                    teamPersonnel.length >
                      0 && (
                      <p className="mt-2 text-xs font-bold text-rose-600">
                        No active personnel available in this team.
                      </p>
                    )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Assignment Notes
                  </label>

                  <textarea
                    rows={3}
                    value={
                      assignmentNotes
                    }
                    onChange={(
                      event
                    ) =>
                      setAssignmentNotes(
                        event
                          .target
                          .value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"
                    placeholder="Instructions for staff..."
                  />
                </div>

                {assignment && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-black text-blue-900">
                      Currently Assigned
                    </p>

                    <p className="mt-1 text-sm font-bold text-blue-800">
                      {
                        assignment.personnel_name
                      }
                    </p>

                    <p className="text-xs text-blue-700">
                      {
                        assignment.team_name
                      }
                    </p>

                    <p className="mt-2 text-[10px] font-semibold text-blue-600">
                      Status:{" "}
                      {
                        assignment.assignment_status
                      }
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={
                    handleAssignTeam
                  }
                  disabled={
                    assignmentLoading ||
                    !selectedStaff ||
                    selectedStaff.account_status !==
                      "Active"
                  }
                  className="w-full rounded-xl bg-emerald-700 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {assignmentLoading
                    ? "Assigning..."
                    : assignment
                    ? "Update Assignment"
                    : "Assign Personnel"}
                </button>
              </div>
            </section>

            {completions.length >
              0 && (
              <section className="rounded-3xl border border-violet-200 bg-white shadow-sm">
                <div className="rounded-t-3xl bg-violet-50 p-6">
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">
                    Completion Verification
                  </p>

                  <h2 className="mt-1 font-black text-slate-900">
                    Staff Completion Proof
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Compare the original report photo with the staff completion evidence.
                  </p>
                </div>

                <div className="space-y-6 p-6">
                  {completions.map(
                    (
                      completion
                    ) => {
                      const pending =
                        completion.verification_status ===
                          "Pending Verification" ||
                        completion.verification_status ===
                          "For Verification";

                      return (
                        <div
                          key={
                            completion.id
                          }
                          className="rounded-2xl border border-slate-200 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`rounded-full px-3 py-1 text-[10px] font-black ${
                                completion.verification_status ===
                                "Verified"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : completion.verification_status ===
                                    "Returned"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-violet-100 text-violet-700"
                              }`}
                            >
                              {
                                completion.verification_status
                              }
                            </span>

                            <span className="text-[10px] text-slate-400">
                              {formatDateTime(
                                completion.submitted_at
                              )}
                            </span>
                          </div>

                          <div className="mt-4">
                            <p className="text-[10px] font-black uppercase text-slate-400">
                              Action Taken
                            </p>

                            <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                              {
                                completion.action_taken
                              }
                            </p>
                          </div>

                          <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="mb-2 text-xs font-black text-slate-500">
                                BEFORE
                              </p>

                              {report.image_urls?.[0] ? (
                                <img
                                  src={
                                    report.image_urls[0]
                                  }
                                  alt="Before"
                                  className="h-56 w-full rounded-xl object-cover"
                                />
                              ) : (
                                <div className="flex h-56 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                                  No before photo
                                </div>
                              )}

                              <p className="mt-2 text-center text-xs font-bold text-slate-500">
                                Resident Report
                              </p>
                            </div>

                            <div>
                              <p className="mb-2 text-xs font-black text-emerald-600">
                                AFTER
                              </p>

                              <img
                                src={
                                  completion.proof_image_url
                                }
                                alt="After"
                                className="h-56 w-full rounded-xl object-cover"
                              />

                              <p className="mt-2 text-center text-xs font-bold text-emerald-700">
                                Staff Completion
                              </p>
                            </div>
                          </div>

                          {completion.verification_note && (
                            <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                              {
                                completion.verification_note
                              }
                            </div>
                          )}

                          {pending && (
                            <div className="mt-5 border-t border-slate-200 pt-5">
                              <label className="text-[10px] font-black uppercase text-slate-500">
                                Return Reason
                              </label>

                              <textarea
                                rows={3}
                                value={
                                  returnNote
                                }
                                onChange={(
                                  event
                                ) =>
                                  setReturnNote(
                                    event
                                      .target
                                      .value
                                  )
                                }
                                placeholder="Explain what still needs to be done..."
                                className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"
                              />

                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <button
                                  type="button"
                                  disabled={
                                    verificationLoading
                                  }
                                  onClick={() =>
                                    returnForAction(
                                      completion.id
                                    )
                                  }
                                  className="rounded-xl border border-rose-300 py-3 text-xs font-black text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                >
                                  Return for Action
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    verificationLoading
                                  }
                                  onClick={() =>
                                    confirmResolution(
                                      completion.id
                                    )
                                  }
                                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-xs font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                                >
                                  <FiCheckCircle />

                                  {verificationLoading
                                    ? "Processing..."
                                    : "Confirm Resolution"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-violet-700">
                    Case History
                  </p>

                  <h2 className="mt-1 font-black text-slate-900">
                    Report Timeline
                  </h2>
                </div>

                <FiClock className="text-violet-700" />
              </div>

              <div className="mt-5 space-y-5">
                {timeline.map(
                  (
                    event,
                    index
                  ) => (
                    <div
                      key={
                        event.id
                      }
                      className="relative pl-7"
                    >
                      {index <
                        timeline.length -
                          1 && (
                        <span className="absolute bottom-[-20px] left-[7px] top-5 w-px bg-slate-200" />
                      )}

                      <span className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-4 border-violet-500 bg-white" />

                      <p className="text-xs font-black text-slate-900">
                        {
                          event.status
                        }
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        {formatDateTime(
                          event.changed_at
                        )}
                      </p>

                      {event.note && (
                        <p className="mt-1 text-xs text-slate-600">
                          {
                            event.note
                          }
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            </section>

            {report.status !==
              "Resolved" && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase text-emerald-700">
                  Barangay Action
                </p>

                <h2 className="mt-1 font-black text-slate-900">
                  Update Case
                </h2>

                <div className="mt-5">
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Report Status
                  </label>

                  <select
                    value={
                      statusInput ===
                      "Resolved"
                        ? "Ongoing"
                        : statusInput
                    }
                    onChange={(
                      event
                    ) =>
                      setStatusInput(
                        event
                          .target
                          .value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"
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
                </div>

                {statusInput ===
                  "Rejected" && (
                  <div className="mt-4">
                    <label className="text-[10px] font-black uppercase text-rose-600">
                      Rejection Reason
                    </label>

                    <textarea
                      rows={3}
                      value={
                        rejectionReason
                      }
                      onChange={(
                        event
                      ) =>
                        setRejectionReason(
                          event
                            .target
                            .value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-rose-200 p-3 text-sm"
                    />
                  </div>
                )}

                <div className="mt-4">
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Remarks
                  </label>

                  <textarea
                    rows={4}
                    value={
                      remarksInput
                    }
                    onChange={(
                      event
                    ) =>
                      setRemarksInput(
                        event
                          .target
                          .value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"
                  />
                </div>

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={
                    handleSaveChanges
                  }
                  className="mt-5 w-full rounded-xl bg-emerald-800 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Case Updates"}
                </button>

                <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3">
                  <p className="text-xs font-bold text-violet-700">
                    A report can only become Resolved after staff submits completion proof and the administrator clicks Confirm Resolution.
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {selectedImage && (
        <div
          onClick={() =>
            setSelectedImage(
              null
            )
          }
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={() =>
              setSelectedImage(
                null
              )
            }
            className="absolute right-5 top-5 text-white"
          >
            <FiX
              size={25}
            />
          </button>

          <img
            src={
              selectedImage
            }
            alt="Evidence"
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          />
        </div>
      )}
    </div>
  );
}