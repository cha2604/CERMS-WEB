import {
  useCallback,
  useEffect,
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
  FiImage,
  FiMapPin,
  FiRefreshCw,
  FiUpload,
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
  const { id } =
    useParams<{
      id: string;
    }>();

  const navigate =
    useNavigate();

  const [
    assignment,
    setAssignment,
  ] =
    useState<AssignmentDetail | null>(
      null
    );

  const [
    completions,
    setCompletions,
  ] =
    useState<Completion[]>(
      []
    );

  const [
    proofFile,
    setProofFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    preview,
    setPreview,
  ] =
    useState("");

  const [
    photoAddedAt,
    setPhotoAddedAt,
  ] =
    useState<string | null>(
      null
    );

  const [
    photoSource,
    setPhotoSource,
  ] =
    useState<
      "camera" | "upload" | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    processing,
    setProcessing,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const loadAssignment =
    useCallback(
      async () => {
        if (!id) {
          return;
        }

        try {
          const {
            data: {
              user,
            },
          } =
            await supabase.auth.getUser();

          if (!user) {
            throw new Error(
              "Please sign in again."
            );
          }

          const {
            data,
            error:
              loadError,
          } =
            await supabase
              .from(
                "report_assignments"
              )
              .select(
                `
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
                `
              )
              .eq(
                "id",
                id
              )
              .eq(
                "staff_id",
                user.id
              )
              .single();

          if (loadError) {
            throw loadError;
          }

          setAssignment(
            data as unknown as AssignmentDetail
          );

          const {
            data:
              completionData,
            error:
              completionError,
          } =
            await supabase
              .from(
                "report_completions"
              )
              .select(
                "id, proof_image_url, captured_at, submitted_at, verification_status, verification_note"
              )
              .eq(
                "assignment_id",
                id
              )
              .order(
                "submitted_at",
                {
                  ascending:
                    false,
                }
              );

          if (
            completionError
          ) {
            throw completionError;
          }

          setCompletions(
            (completionData ||
              []) as Completion[]
          );

          setError("");
        } catch (
          loadError
        ) {
          console.error(
            "Failed to load assignment:",
            loadError
          );

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load assignment."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [id]
    );

  useEffect(() => {
    loadAssignment();

    if (!id) {
      return;
    }

    const channel =
      supabase
        .channel(
          `staff-assignment-${id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "report_assignments",
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
            table:
              "report_completions",
            filter: `assignment_id=eq.${id}`,
          },
          () => {
            loadAssignment();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    id,
    loadAssignment,
  ]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(
          preview
        );
      }
    };
  }, [preview]);

  const startResponse =
    async () => {
      if (
        !assignment?.reports
      ) {
        return;
      }

      try {
        setProcessing(
          true
        );

        setError("");
        setMessage("");

        const {
          error:
            rpcError,
        } =
          await supabase.rpc(
            "staff_start_response",
            {
              p_report_id:
                assignment
                  .reports.id,
            }
          );

        if (rpcError) {
          throw rpcError;
        }

        setMessage(
          "Response started successfully."
        );

        await loadAssignment();
      } catch (
        responseError
      ) {
        console.error(
          responseError
        );

        setError(
          responseError instanceof
            Error
            ? responseError.message
            : "Unable to start response."
        );
      } finally {
        setProcessing(
          false
        );
      }
    };

  const handlePhoto = (
    file: File | null,
    source:
      | "camera"
      | "upload"
  ) => {
    setError("");

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select a valid image."
      );

      return;
    }

    if (preview) {
      URL.revokeObjectURL(
        preview
      );
    }

    setProofFile(
      file
    );

    setPreview(
      URL.createObjectURL(
        file
      )
    );

    setPhotoAddedAt(
      new Date().toISOString()
    );

    setPhotoSource(
      source
    );
  };

  const clearPhoto =
    () => {
      if (preview) {
        URL.revokeObjectURL(
          preview
        );
      }

      setProofFile(
        null
      );

      setPreview("");
      setPhotoAddedAt(
        null
      );
      setPhotoSource(
        null
      );
    };

  const submitCompletion =
    async () => {
      if (
        !assignment?.reports
      ) {
        return;
      }

      if (
        !proofFile ||
        !photoAddedAt
      ) {
        setError(
          "Please take or upload a completion photo."
        );

        return;
      }

      try {
        setProcessing(
          true
        );

        setError("");
        setMessage("");

        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "Please sign in again."
          );
        }

        const extension =
          proofFile.name
            .split(".")
            .pop()
            ?.toLowerCase() ||
          "jpg";

        const filePath =
          `${user.id}/${assignment.reports.id}/${Date.now()}.${extension}`;

        const {
          error:
            uploadError,
        } =
          await supabase.storage
            .from(
              "completion-proofs"
            )
            .upload(
              filePath,
              proofFile,
              {
                upsert:
                  false,
                contentType:
                  proofFile.type,
              }
            );

        if (
          uploadError
        ) {
          throw uploadError;
        }

        const {
          data:
            publicUrlData,
        } =
          supabase.storage
            .from(
              "completion-proofs"
            )
            .getPublicUrl(
              filePath
            );

        const {
          error:
            submitError,
        } =
          await supabase.rpc(
            "staff_submit_completion",
            {
              p_report_id:
                assignment
                  .reports.id,
              p_proof_image_url:
                publicUrlData.publicUrl,
              p_captured_at:
                photoAddedAt,
            }
          );

        if (
          submitError
        ) {
          await supabase.storage
            .from(
              "completion-proofs"
            )
            .remove([
              filePath,
            ]);

          throw submitError;
        }

        clearPhoto();

        setMessage(
          "Completion photo submitted. Waiting for administrator confirmation."
        );

        await loadAssignment();
      } catch (
        completionError
      ) {
        console.error(
          "Unable to submit completion:",
          completionError
        );

        setError(
          completionError instanceof
            Error
            ? completionError.message
            : "Unable to submit completion."
        );
      } finally {
        setProcessing(
          false
        );
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

  if (
    !assignment ||
    !assignment.reports
  ) {
    return (
      <div className="py-20 text-center text-sm font-bold text-slate-400">
        Assignment not found.
      </div>
    );
  }

  const report =
    assignment.reports;

  const isAssigned =
    assignment.assignment_status ===
    "Assigned";

  const canSubmit =
    assignment.assignment_status ===
      "Ongoing" ||
    assignment.assignment_status ===
      "Returned" ||
    assignment.assignment_status ===
      "Returned for Action";

  const waitingForAdmin =
    assignment.assignment_status ===
    "For Verification";

  const isResolved =
    assignment.assignment_status ===
    "Resolved";

  const isReturned =
    assignment.assignment_status ===
      "Returned" ||
    assignment.assignment_status ===
      "Returned for Action";

  const latestCompletion =
    completions[0] ||
    null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button
        type="button"
        onClick={() =>
          navigate(
            "/assignments"
          )
        }
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
              {report.waste_type ||
                report.title ||
                "Waste Report"}
            </h1>

            <div className="mt-3 flex items-start gap-2 text-sm font-semibold text-slate-500">
              <FiMapPin className="mt-0.5 shrink-0" />

              <span>
                {report.location_name ||
                  "Barangay Tankulan"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[9px] font-black uppercase text-slate-400">
                Status
              </p>

              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
                  assignment.assignment_status
                )}`}
              >
                {
                  assignment.assignment_status
                }
              </span>
            </div>

            <div className="rounded-2xl bg-amber-50 px-4 py-3">
              <p className="text-[9px] font-black uppercase text-amber-600">
                Severity
              </p>

              <p className="mt-1 text-sm font-black text-amber-800">
                {report.severity ||
                  "None"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-900">
            Resident Report Photo
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-500">
            Original photo submitted by the resident.
          </p>

          <div className="mt-4 overflow-hidden rounded-2xl bg-slate-100">
            {report.image_urls?.[0] ? (
              <img
                src={
                  report.image_urls[0]
                }
                alt="Resident report"
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
          <h2 className="font-black text-slate-900">
            Report Information
          </h2>

          <p className="mt-5 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Description
          </p>

          <p className="mt-2 text-sm font-medium leading-7 text-slate-700">
            {report.description ||
              "No description provided."}
          </p>

          {assignment.notes && (
            <>
              <p className="mt-6 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Admin Instruction
              </p>

              <p className="mt-2 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                {
                  assignment.notes
                }
              </p>
            </>
          )}
        </section>
      </div>

      {isAssigned && (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="font-black text-blue-900">
            Ready to Respond
          </h2>

          <p className="mt-1 text-sm font-medium text-blue-700">
            Click Start Response when you begin handling this waste concern.
          </p>

          <button
            type="button"
            disabled={
              processing
            }
            onClick={
              startResponse
            }
            className="mt-5 w-full rounded-2xl bg-blue-700 py-4 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {processing
              ? "Starting Response..."
              : "Start Response"}
          </button>
        </section>
      )}

      {isReturned && (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <h2 className="font-black text-rose-900">
            Returned for Additional Action
          </h2>

          <p className="mt-1 text-sm font-medium text-rose-700">
            The administrator reviewed your completion photo and requested additional action.
          </p>

          {latestCompletion?.verification_note && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                Administrator Note
              </p>

              <p className="mt-2 text-sm font-semibold text-rose-800">
                {
                  latestCompletion.verification_note
                }
              </p>
            </div>
          )}
        </section>
      )}

      {canSubmit && (
        <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <FiImage size={21} />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                Completion Proof
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-900">
                Submit Completion Photo
              </h2>

              <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                Take a new photo or upload an existing photo showing that the waste concern has already been handled.
              </p>
            </div>
          </div>

          {preview ? (
            <div className="mt-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <img
                  src={
                    preview
                  }
                  alt="Completion preview"
                  className="h-72 w-full object-cover"
                />
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Photo Added
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-800">
                      {formatDateTime(
                        photoAddedAt
                      )}
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700">
                    {photoSource ===
                    "camera"
                      ? "Camera"
                      : "Uploaded"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  clearPhoto
                }
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 py-3 text-xs font-black text-rose-600 hover:bg-rose-50"
              >
                <FiX />
                Remove Photo
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-5 py-7 text-center transition hover:bg-emerald-100">
                <FiCamera
                  size={24}
                  className="text-emerald-700"
                />

                <span className="mt-3 text-sm font-black text-emerald-800">
                  Take Photo
                </span>

                <span className="mt-1 text-[11px] font-medium text-emerald-600">
                  Use the device camera
                </span>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(
                    event
                  ) =>
                    handlePhoto(
                      event.target
                        .files?.[0] ||
                        null,
                      "camera"
                    )
                  }
                />
              </label>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 px-5 py-7 text-center transition hover:bg-blue-100">
                <FiUpload
                  size={24}
                  className="text-blue-700"
                />

                <span className="mt-3 text-sm font-black text-blue-800">
                  Upload Photo
                </span>

                <span className="mt-1 text-[11px] font-medium text-blue-600">
                  Select from gallery or files
                </span>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(
                    event
                  ) =>
                    handlePhoto(
                      event.target
                        .files?.[0] ||
                        null,
                      "upload"
                    )
                  }
                />
              </label>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-xs font-black text-violet-900">
              Administrator confirmation required
            </p>

            <p className="mt-1 text-xs font-medium leading-5 text-violet-700">
              Submitting the photo will send this report for verification. It will only become officially Resolved after the administrator confirms the completion photo.
            </p>
          </div>

          <button
            type="button"
            disabled={
              processing ||
              !proofFile ||
              !photoAddedAt
            }
            onClick={
              submitCompletion
            }
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-4 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiCheckCircle />

            {processing
              ? "Submitting..."
              : "Submit as Resolved"}
          </button>
        </section>
      )}

      {waitingForAdmin && (
        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-700">
            <FiClock
              size={26}
            />
          </div>

          <p className="mt-4 text-lg font-black text-violet-900">
            Waiting for Administrator Confirmation
          </p>

          <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-violet-700">
            Your completion photo has been submitted. The administrator will compare it with the original resident report before confirming the resolution.
          </p>
        </section>
      )}

      {isResolved && (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <FiCheckCircle
              size={28}
            />
          </div>

          <p className="mt-4 text-lg font-black text-emerald-900">
            Resolution Confirmed
          </p>

          <p className="mt-2 text-sm font-medium text-emerald-700">
            The administrator verified the completion photo and officially marked this report as Resolved.
          </p>
        </section>
      )}

      {completions.length >
        0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-black text-slate-900">
            Completion History
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-500">
            Previously submitted completion photos for this report.
          </p>

          <div className="mt-5 space-y-5">
            {completions.map(
              (
                completion
              ) => (
                <div
                  key={
                    completion.id
                  }
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black ${getVerificationClass(
                        completion.verification_status
                      )}`}
                    >
                      {
                        completion.verification_status
                      }
                    </span>

                    <span className="text-[10px] font-semibold text-slate-400">
                      Submitted{" "}
                      {formatDateTime(
                        completion.submitted_at
                      )}
                    </span>
                  </div>

                  <img
                    src={
                      completion.proof_image_url
                    }
                    alt="Completion proof"
                    className="mt-4 h-64 w-full rounded-2xl object-cover"
                  />

                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase text-slate-400">
                      Photo Added
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-700">
                      {formatDateTime(
                        completion.captured_at
                      )}
                    </p>
                  </div>

                  {completion.verification_note && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                        Administrator Note
                      </p>

                      <p className="mt-1 text-xs font-semibold leading-5 text-rose-700">
                        {
                          completion.verification_note
                        }
                      </p>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}