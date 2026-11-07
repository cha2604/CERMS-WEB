import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  FiArrowLeft,
  FiCamera,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

interface AssignmentDetail {
  id: string;
  assignment_status: string;
  team_name: string;
  personnel_name: string;
  notes: string | null;
  assigned_at: string;
  reports: {
    id: string;
    title: string;
    waste_type: string;
    description: string;
    severity: string | null;
    status: string;
    location_name: string | null;
    latitude: number | null;
    longitude: number | null;
    image_urls: string[] | null;
    created_at: string;
  } | null;
}

interface Completion {
  id: string;
  action_taken: string;
  proof_image_url: string;
  captured_at: string | null;
  submitted_at: string;
  verification_status: string;
  verification_note: string | null;
}

function getStatusClass(status: string) {
  switch (status) {
    case "Assigned":
      return "bg-amber-100 text-amber-700";
    case "Ongoing":
      return "bg-blue-100 text-blue-700";
    case "For Verification":
      return "bg-violet-100 text-violet-700";
    case "Returned":
    case "Returned for Action":
      return "bg-rose-100 text-rose-700";
    case "Resolved":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getVerificationClass(status: string) {
  switch (status) {
    case "Verified":
      return "bg-emerald-100 text-emerald-700";
    case "Returned":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-violet-100 text-violet-700";
  }
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export default function AssignmentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [photoAddedAt, setPhotoAddedAt] = useState<string | null>(null);
  const [actionTaken, setActionTaken] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraActive(false);
  }, []);

  const loadAssignment = useCallback(async () => {
    if (!id) {
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please sign in again.");
      }

      const { data, error: loadError } = await supabase
        .from("report_assignments")
        .select(`
          id,
          assignment_status,
          team_name,
          personnel_name,
          notes,
          assigned_at,
          reports (
            id,
            title,
            waste_type,
            description,
            severity,
            status,
            location_name,
            latitude,
            longitude,
            image_urls,
            created_at
          )
        `)
        .eq("id", id)
        .eq("staff_id", user.id)
        .single();

      if (loadError) {
        throw loadError;
      }

      setAssignment(data as unknown as AssignmentDetail);

      const {
        data: completionData,
        error: completionError,
      } = await supabase
        .from("report_completions")
        .select("id, action_taken, proof_image_url, captured_at, submitted_at, verification_status, verification_note")
        .eq("assignment_id", id)
        .order("submitted_at", { ascending: false });

      if (completionError) {
        throw completionError;
      }

      setCompletions((completionData || []) as Completion[]);
      setError("");
    } catch (loadError) {
      console.error("Failed to load assignment:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load assignment."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAssignment();

    if (!id) {
      return;
    }

    const channel = supabase
      .channel(`staff-assignment-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "report_assignments",
          filter: `id=eq.${id}`,
        },
        () => {
          loadAssignment();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "report_completions",
          filter: `assignment_id=eq.${id}`,
        },
        () => {
          loadAssignment();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadAssignment]);

  useEffect(() => {
    if (cameraActive && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
      videoRef.current.play().catch(() => {
        setError("Unable to start the camera preview. Please check camera permission.");
      });
    }
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const startResponse = async () => {
    if (!assignment?.reports) {
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setMessage("");

      const { error: rpcError } = await supabase.rpc("staff_start_response", {
        p_report_id: assignment.reports.id,
      });

      if (rpcError) {
        throw rpcError;
      }

      setMessage("Response started successfully.");
      await loadAssignment();
    } catch (responseError) {
      console.error(responseError);
      setError(
        responseError instanceof Error
          ? responseError.message
          : "Unable to start response."
      );
    } finally {
      setProcessing(false);
    }
  };

  const openCamera = async () => {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is not available in this browser. Please use a supported browser over HTTPS.");
      return;
    }

    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
        },
      });

      cameraStreamRef.current = stream;
      setCameraActive(true);
    } catch (cameraError) {
      console.error("Unable to access camera:", cameraError);
      const cameraName = cameraError instanceof Error ? cameraError.name : "";

      if (cameraName === "NotAllowedError" || cameraName === "PermissionDeniedError") {
        setError("Camera permission was denied. Please allow camera access in your browser settings.");
      } else if (cameraName === "NotFoundError" || cameraName === "DevicesNotFoundError") {
        setError("No camera was found on this device.");
      } else {
        setError("Unable to open the camera. Please check that no other application is using it.");
      }
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("The camera is not ready yet. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setError("Unable to capture the photo. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Unable to process the captured photo. Please try again.");
          return;
        }

        const file = new File([blob], `completion-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        setProofFile(file);
        setPreview(URL.createObjectURL(file));
        setPhotoAddedAt(new Date().toISOString());
        setError("");
        stopCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  const clearPhoto = () => {
    stopCamera();
    setProofFile(null);
    setPreview("");
    setPhotoAddedAt(null);
  };

  const retakePhoto = async () => {
    clearPhoto();
    await openCamera();
  };

  const submitCompletion = async () => {
    if (!assignment?.reports) {
      return;
    }

    if (!proofFile || !photoAddedAt) {
      setError("Please capture a completion photo using the camera.");
      return;
    }

    if (!actionTaken.trim()) {
      setError("Please describe the action taken before submitting.");
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please sign in again.");
      }

      const filePath = `${user.id}/${assignment.reports.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("completion-proofs")
        .upload(filePath, proofFile, {
          upsert: false,
          contentType: proofFile.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("completion-proofs")
        .getPublicUrl(filePath);

      const { error: submitError } = await supabase.rpc(
        "staff_submit_completion",
        {
          p_report_id: assignment.reports.id,
          p_proof_image_url: publicUrlData.publicUrl,
          p_captured_at: photoAddedAt,
          p_action_taken: actionTaken.trim(),
        }
      );

      if (submitError) {
        await supabase.storage
          .from("completion-proofs")
          .remove([filePath]);
        throw submitError;
      }

      clearPhoto();
      setActionTaken("");
      setMessage("Completion photo submitted for administrator verification.");
      await loadAssignment();
    } catch (completionError) {
      console.error("Unable to submit completion:", completionError);
      setError(
        completionError instanceof Error
          ? completionError.message
          : "Unable to submit completion."
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-bold text-slate-400">
        <FiRefreshCw className="animate-spin" />
        Loading assignment...
      </div>
    );
  }

  if (!assignment || !assignment.reports) {
    return (
      <div className="py-20 text-center text-sm font-bold text-slate-400">
        Assignment not found.
      </div>
    );
  }

  const report = assignment.reports;
  const isAssigned = assignment.assignment_status === "Assigned";
  const canSubmit =
    assignment.assignment_status === "Ongoing" ||
    assignment.assignment_status === "Returned" ||
    assignment.assignment_status === "Returned for Action";
  const waitingForAdmin = assignment.assignment_status === "For Verification";
  const isResolved = assignment.assignment_status === "Resolved";
  const isReturned =
    assignment.assignment_status === "Returned" ||
    assignment.assignment_status === "Returned for Action";
  const latestCompletion = completions[0] || null;
  const hasCoordinates = report.latitude !== null && report.longitude !== null;
  const mapUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${report.latitude},${report.longitude}`
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button
        type="button"
        onClick={() => navigate("/assignments")}
        className="flex items-center gap-2 text-sm font-black text-emerald-800"
      >
        <FiArrowLeft />
        Back to Assignments
      </button>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
              Assigned Waste Report
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">
              {report.waste_type || report.title || "Waste Report"}
            </h1>
            <div className="mt-3 flex items-start gap-2 text-sm font-semibold text-slate-500">
              <FiMapPin className="mt-0.5 shrink-0" />
              <span>{report.location_name || "Barangay Tankulan"}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[9px] font-black uppercase text-slate-400">Assignment Status</p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
                  assignment.assignment_status
                )}`}
              >
                {assignment.assignment_status}
              </span>
            </div>

            <div className="rounded-2xl bg-amber-50 px-4 py-3">
              <p className="text-[9px] font-black uppercase text-amber-600">Severity</p>
              <p className="mt-1 text-sm font-black text-amber-800">
                {report.severity || "Not set"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-900">Resident Report Photo</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Original photo submitted with the waste report.
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl bg-slate-100">
            {report.image_urls?.[0] ? (
              <img
                src={report.image_urls[0]}
                alt="Original waste report"
                className="h-72 w-full object-cover"
              />
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-slate-400">
                No photo available
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-black text-slate-900">Report Information</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Waste Type
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {report.waste_type || report.title || "Not specified"}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Description
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700">
                {report.description || "No description provided."}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Report Status
              </p>
              <span
                className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
                  report.status
                )}`}
              >
                {report.status || "Not available"}
              </span>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Severity Level
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {report.severity || "Not set"}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Report Location
              </p>
              <p className="mt-1 flex items-start gap-2 text-sm font-semibold text-slate-700">
                <FiMapPin className="mt-0.5 shrink-0 text-emerald-700" />
                {report.location_name || "Barangay Tankulan"}
              </p>
              {hasCoordinates && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>
                    Latitude: {report.latitude} | Longitude: {report.longitude}
                  </span>
                  <a
                    href={mapUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-emerald-700 underline"
                  >
                    Open map location
                  </a>
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Date Reported
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {formatDateTime(report.created_at)}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Date Assigned
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {formatDateTime(assignment.assigned_at)}
              </p>
            </div>
          </div>

          {assignment.notes && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Admin Instruction
              </p>
              <p className="mt-2 rounded-xl bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">
                {assignment.notes}
              </p>
            </div>
          )}
        </section>
      </div>

      {isAssigned && (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="font-black text-blue-900">Ready to Respond</h2>
          <p className="mt-1 text-sm font-medium text-blue-700">
            Click Start Response when you begin handling this waste concern.
          </p>
          <button
            type="button"
            disabled={processing}
            onClick={startResponse}
            className="mt-5 w-full rounded-2xl bg-blue-700 py-4 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {processing ? "Starting Response..." : "Start Response"}
          </button>
        </section>
      )}

      {isReturned && (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <h2 className="font-black text-rose-900">Returned for Additional Action</h2>
          <p className="mt-1 text-sm font-medium text-rose-700">
            The administrator reviewed your completion photo and requested additional action.
          </p>
          {latestCompletion?.verification_note && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                Administrator Note
              </p>
              <p className="mt-2 text-sm font-semibold text-rose-800">
                {latestCompletion.verification_note}
              </p>
            </div>
          )}
        </section>
      )}

      {canSubmit && (
        <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <FiCamera size={21} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                Completion Proof
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-900">
                Submit Completion Photo
              </h2>
              <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                Capture a new photo using your device camera to show that the waste concern has been handled.
              </p>
            </div>
          </div>

          {cameraActive && (
            <div className="mt-6 space-y-3">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="max-h-[28rem] min-h-64 w-full object-contain"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-800"
                >
                  <FiCamera />
                  Capture Photo
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
                >
                  <FiX />
                  Cancel Camera
                </button>
              </div>
            </div>
          )}

          {preview && !cameraActive && (
            <div className="mt-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <img
                  src={preview}
                  alt="Captured completion photo preview"
                  className="h-72 w-full object-contain"
                />
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Photo Captured
                </p>
                <p className="mt-1 text-sm font-black text-slate-800">
                  {formatDateTime(photoAddedAt)}
                </p>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={retakePhoto}
                  disabled={processing}
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 py-3 text-xs font-black text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                >
                  <FiCamera />
                  Retake Photo
                </button>
                <button
                  type="button"
                  onClick={clearPhoto}
                  disabled={processing}
                  className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 py-3 text-xs font-black text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  <FiX />
                  Remove Photo
                </button>
              </div>
            </div>
          )}

          {!cameraActive && !preview && (
            <button
              type="button"
              onClick={openCamera}
              disabled={processing}
              className="mt-6 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-5 py-8 text-center transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiCamera size={28} className="text-emerald-700" />
              <span className="mt-3 text-sm font-black text-emerald-800">
                Open Camera
              </span>
              <span className="mt-1 text-[11px] font-medium text-emerald-600">
                Capture the after-cleanup photo
              </span>
            </button>
          )}

          <div className="mt-6">
            <label
              htmlFor="action-taken"
              className="text-xs font-black uppercase tracking-wider text-slate-600"
            >
              Action Taken
            </label>
            <textarea
              id="action-taken"
              value={actionTaken}
              onChange={(event) => setActionTaken(event.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Describe the cleanup or action performed..."
              disabled={processing}
              className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
            />
            <p className="mt-1 text-right text-[10px] font-medium text-slate-400">
              {actionTaken.length}/1000
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-xs font-black text-violet-900">
              Administrator confirmation required
            </p>
            <p className="mt-1 text-xs font-medium leading-5 text-violet-700">
              Submitting the photo and action taken will send this report for verification. It will only become officially Resolved after the administrator confirms the completion.
            </p>
          </div>

          <button
            type="button"
            disabled={
              processing ||
              !proofFile ||
              !photoAddedAt ||
              !actionTaken.trim() ||
              cameraActive
            }
            onClick={submitCompletion}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-4 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiCheckCircle />
            {processing ? "Submitting..." : "Submit for Verification"}
          </button>
        </section>
      )}

      {waitingForAdmin && (
        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-700">
            <FiClock size={26} />
          </div>
          <p className="mt-4 text-lg font-black text-violet-900">
            Waiting for Administrator Confirmation
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-violet-700">
            Your completion photo and action description have been submitted. The administrator will review them before confirming the resolution.
          </p>
        </section>
      )}

      {isResolved && (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <FiCheckCircle size={28} />
          </div>
          <p className="mt-4 text-lg font-black text-emerald-900">
            Resolution Confirmed
          </p>
          <p className="mt-2 text-sm font-medium text-emerald-700">
            The administrator verified the completion photo and officially marked this report as Resolved.
          </p>
        </section>
      )}

      {completions.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-black text-slate-900">Completion History</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Previously submitted completion photos and action descriptions for this report.
          </p>

          <div className="mt-5 space-y-5">
            {completions.map((completion) => (
              <div
                key={completion.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black ${getVerificationClass(
                      completion.verification_status
                    )}`}
                  >
                    {completion.verification_status}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Submitted {formatDateTime(completion.submitted_at)}
                  </span>
                </div>

                <img
                  src={completion.proof_image_url}
                  alt="Staff completion proof"
                  className="mt-4 h-64 w-full rounded-2xl object-cover"
                />

                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    Action Taken
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                    {completion.action_taken || "No action description available."}
                  </p>
                </div>

                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    Photo Captured
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-700">
                    {formatDateTime(completion.captured_at)}
                  </p>
                </div>

                {completion.verification_note && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                      Administrator Note
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-rose-700">
                      {completion.verification_note}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}