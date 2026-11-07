import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiRefreshCw,
  FiX,
  FiZoomIn,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

interface Completion {
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

interface Report {
  id: string;
  title: string | null;
  waste_type: string | null;
  description: string | null;
  location_name: string | null;
  image_urls: string[] | null;
  status: string;
  severity: string | null;
  created_at: string;
}

interface Assignment {
  id: string;
  team_name: string | null;
  personnel_name: string | null;
  assignment_status: string | null;
  assigned_at: string;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getVerificationStyle(status: string) {
  switch (status) {
    case "Verified":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Returned":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-violet-100 text-violet-800 border-violet-200";
  }
}

export default function CompletionReview() {
  const { completionId } = useParams<{
    completionId: string;
  }>();

  const navigate = useNavigate();

  const [completion, setCompletion] = useState<Completion | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);

  const [returnNote, setReturnNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadReview = async (showLoader = false) => {
    if (!completionId) {
      setErrorMessage("Completion record ID is missing.");
      setLoading(false);
      return;
    }

    try {
      if (showLoader) {
        setLoading(true);
      }

      const {
        data: completionData,
        error: completionError,
      } = await supabase
        .from("report_completions")
        .select(
          "id, report_id, assignment_id, staff_id, action_taken, proof_image_url, verification_status, verification_note, submitted_at"
        )
        .eq("id", completionId)
        .single();

      if (completionError) {
        throw completionError;
      }

      const [
        reportResponse,
        assignmentResponse,
      ] = await Promise.all([
        supabase
          .from("reports")
          .select(
            "id, title, waste_type, description, location_name, image_urls, status, severity, created_at"
          )
          .eq("id", completionData.report_id)
          .single(),

        supabase
          .from("report_assignments")
          .select(
            "id, team_name, personnel_name, assignment_status, assigned_at"
          )
          .eq("id", completionData.assignment_id)
          .single(),
      ]);

      if (reportResponse.error) {
        throw reportResponse.error;
      }

      if (assignmentResponse.error) {
        throw assignmentResponse.error;
      }

      setCompletion(completionData as Completion);
      setReport(reportResponse.data as Report);
      setAssignment(assignmentResponse.data as Assignment);
      setErrorMessage("");
    } catch (loadError) {
      console.error("Failed to load completion review:", loadError);

      setErrorMessage(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load completion review."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReview(true);

    if (!completionId) {
      return;
    }

    const channel = supabase
      .channel(`admin-completion-review-${completionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "report_completions",
          filter: `id=eq.${completionId}`,
        },
        () => {
          loadReview();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [completionId]);

  const confirmResolution = async () => {
    if (!completion) {
      return;
    }

    try {
      setVerificationLoading(true);
      setErrorMessage("");
      setMessage("");

      const { error } = await supabase.rpc(
        "admin_verify_completion",
        {
          p_completion_id: completion.id,
        }
      );

      if (error) {
        throw error;
      }

      setCompletion((previous) =>
        previous
          ? {
              ...previous,
              verification_status: "Verified",
            }
          : previous
      );

      setReport((previous) =>
        previous
          ? {
              ...previous,
              status: "Resolved",
            }
          : previous
      );

      setAssignment((previous) =>
        previous
          ? {
              ...previous,
              assignment_status: "Resolved",
            }
          : previous
      );

      setShowConfirm(false);

      setMessage(
        "Completion successfully verified. The report and assignment are now officially RESOLVED."
      );

      await loadReview();
    } catch (confirmError) {
      console.error("Failed to confirm completion:", confirmError);

      setErrorMessage(
        confirmError instanceof Error
          ? confirmError.message
          : "Unable to confirm resolution."
      );
    } finally {
      setVerificationLoading(false);
    }
  };

  const returnForAction = async () => {
    if (!completion) {
      return;
    }

    if (!returnNote.trim()) {
      setErrorMessage(
        "Please provide a reason for returning this completion."
      );
      return;
    }

    try {
      setVerificationLoading(true);
      setErrorMessage("");
      setMessage("");

      const { error } = await supabase.rpc(
        "admin_return_completion",
        {
          p_completion_id: completion.id,
          p_verification_note: returnNote.trim(),
        }
      );

      if (error) {
        throw error;
      }

      setCompletion((previous) =>
        previous
          ? {
              ...previous,
              verification_status: "Returned",
              verification_note: returnNote.trim(),
            }
          : previous
      );

      setReport((previous) =>
        previous
          ? {
              ...previous,
              status: "Ongoing",
            }
          : previous
      );

      setAssignment((previous) =>
        previous
          ? {
              ...previous,
              assignment_status: "Returned",
            }
          : previous
      );

      setReturnNote("");

      setMessage(
        "Completion returned successfully. The assigned Staff member has been notified."
      );

      await loadReview();
    } catch (returnError) {
      console.error("Failed to return completion:", returnError);

      setErrorMessage(
        returnError instanceof Error
          ? returnError.message
          : "Unable to return completion."
      );
    } finally {
      setVerificationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
          <FiRefreshCw className="animate-spin" />
          Loading completion review...
        </div>
      </div>
    );
  }

  if (!completion || !report || !assignment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6">
        <p className="text-lg font-black text-slate-800">
          Completion Review Not Found
        </p>

        {errorMessage && (
          <p className="max-w-lg text-center text-sm text-rose-600">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isPending =
    completion.verification_status === "Pending Verification";

  const isVerified =
    completion.verification_status === "Verified";

  const isReturned =
    completion.verification_status === "Returned";

  const beforePhoto = report.image_urls?.[0] || null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            <FiArrowLeft />
            Back to Dashboard
          </button>

          <span
            className={`rounded-full border px-4 py-2 text-xs font-black ${getVerificationStyle(
              completion.verification_status
            )}`}
          >
            {isVerified
              ? "RESOLVED"
              : isReturned
                ? "RETURNED FOR ACTION"
                : "PENDING VERIFICATION"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            <div className="flex items-center gap-2">
              <FiCheckCircle size={19} />
              {message}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {errorMessage}
          </div>
        )}

        {isVerified && (
          <section className="rounded-3xl border border-emerald-300 bg-emerald-50 p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <FiCheckCircle size={30} />
              </div>

              <div>
                <p className="text-xl font-black text-emerald-900">
                  REPORT RESOLVED
                </p>

                <p className="mt-1 text-sm font-medium text-emerald-700">
                  Admin has verified the Staff completion photo. The report and assignment are officially resolved.
                </p>
              </div>
            </div>
          </section>
        )}

        {isReturned && (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
            <h2 className="font-black text-rose-900">
              Returned for Additional Action
            </h2>

            <p className="mt-2 text-sm font-medium leading-6 text-rose-700">
              The completion submission was returned to the assigned Staff member.
            </p>

            <div className="mt-4 rounded-xl border border-rose-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                Administrator's Reason
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-rose-800">
                {completion.verification_note}
              </p>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">
            Staff Completion Verification
          </p>

          <h1 className="mt-2 text-2xl font-black text-slate-900">
            {report.waste_type ||
              report.title ||
              "Waste Report"}
          </h1>

          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
            <FiMapPin />
            {report.location_name || "Barangay Tankulan"}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase text-slate-400">
                Report Status
              </p>

              <p className="mt-2 text-sm font-black text-slate-800">
                {report.status}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase text-slate-400">
                Severity
              </p>

              <p className="mt-2 text-sm font-black text-slate-800">
                {report.severity || "Not assessed"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase text-slate-400">
                Assigned Staff
              </p>

              <p className="mt-2 text-sm font-black text-slate-800">
                {assignment.personnel_name || "Assigned Staff"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase text-slate-400">
                Response Team
              </p>

              <p className="mt-2 text-sm font-black text-slate-800">
                {assignment.team_name || "Not specified"}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Original Report Description
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700">
              {report.description || "No description provided."}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-5 text-xs font-semibold text-slate-500">
            <span>
              Date Reported: {formatDateTime(report.created_at)}
            </span>

            <span>
              Date Assigned: {formatDateTime(assignment.assigned_at)}
            </span>

            <span>
              Date Submitted: {formatDateTime(completion.submitted_at)}
            </span>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">
                Evidence Comparison
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                Before and After Cleanup
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Compare the original resident report with the Staff completion evidence.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
              Photo Verification
            </span>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-700">
                  BEFORE
                </h3>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600">
                  Resident Report
                </span>
              </div>

              {beforePhoto ? (
                <button
                  type="button"
                  onClick={() => setPreviewImage(beforePhoto)}
                  className="group relative block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                >
                  <img
                    src={beforePhoto}
                    alt="Original resident report"
                    className="h-80 w-full object-contain"
                  />

                  <span className="absolute bottom-3 right-3 flex items-center gap-2 rounded-xl bg-black/70 px-3 py-2 text-xs font-bold text-white">
                    <FiZoomIn />
                    Enlarge Photo
                  </span>
                </button>
              ) : (
                <div className="flex h-80 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-400">
                  No original report photo available.
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-emerald-700">
                  AFTER
                </h3>

                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700">
                  Staff Completion
                </span>
              </div>

              {completion.proof_image_url ? (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewImage(completion.proof_image_url)
                  }
                  className="group relative block w-full overflow-hidden rounded-2xl border border-emerald-200 bg-slate-100"
                >
                  <img
                    src={completion.proof_image_url}
                    alt="Staff completion photo"
                    className="h-80 w-full object-contain"
                  />

                  <span className="absolute bottom-3 right-3 flex items-center gap-2 rounded-xl bg-black/70 px-3 py-2 text-xs font-bold text-white">
                    <FiZoomIn />
                    Enlarge Photo
                  </span>
                </button>
              ) : (
                <div className="flex h-80 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-400">
                  No completion photo available.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
            Staff Report
          </p>

          <h2 className="mt-1 text-lg font-black text-slate-900">
            Action Taken
          </h2>

          <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-emerald-50 p-5 text-sm font-medium leading-7 text-emerald-900">
            {completion.action_taken || "No action description provided."}
          </p>
        </section>

        {isPending && (
          <section className="rounded-3xl border border-violet-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <FiClock size={21} />
              </div>

              <div>
                <h2 className="font-black text-slate-900">
                  Administrator Verification
                </h2>

                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                  Review the before-and-after photos and the Staff action description before deciding.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label
                htmlFor="return-note"
                className="text-xs font-black uppercase tracking-wider text-slate-600"
              >
                Return Reason
              </label>

              <textarea
                id="return-note"
                value={returnNote}
                onChange={(event) =>
                  setReturnNote(event.target.value)
                }
                rows={4}
                maxLength={1000}
                placeholder="Explain what additional action is required..."
                disabled={verificationLoading}
                className="mt-2 w-full rounded-xl border border-slate-300 p-4 text-sm font-medium outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-slate-50"
              />

              <p className="mt-1 text-right text-[10px] text-slate-400">
                {returnNote.length}/1000
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={verificationLoading || !returnNote.trim()}
                onClick={returnForAction}
                className="rounded-xl border border-rose-300 px-5 py-4 text-sm font-black text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Return for Action
              </button>

              <button
                type="button"
                disabled={verificationLoading}
                onClick={() => setShowConfirm(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-4 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiCheckCircle />
                Confirm Resolution
              </button>
            </div>
          </section>
        )}

        {isVerified && (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center gap-3">
              <FiCheckCircle
                size={25}
                className="text-emerald-700"
              />

              <div>
                <h2 className="font-black text-emerald-900">
                  Verification Completed
                </h2>

                <p className="mt-1 text-sm font-medium text-emerald-700">
                  This completion has already been approved. The report and assignment are marked Resolved.
                </p>
              </div>
            </div>
          </section>
        )}

        {isReturned && (
          <section className="rounded-3xl border border-rose-200 bg-white p-6">
            <p className="text-sm font-bold text-rose-800">
              This submission has already been returned. The Staff member must perform the additional action and submit new completion evidence.
            </p>
          </section>
        )}
      </main>

      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <FiCheckCircle size={28} />
            </div>

            <h2 className="mt-4 text-center text-xl font-black text-slate-900">
              Confirm Resolution?
            </h2>

            <p className="mt-3 text-center text-sm font-medium leading-6 text-slate-500">
              Have you reviewed the completion photo and confirmed that the waste concern has been properly addressed?
            </p>

            <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-center text-xs font-bold text-emerald-800">
              Confirming will automatically mark the report and assignment as RESOLVED.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={verificationLoading}
                onClick={() => setShowConfirm(false)}
                className="rounded-xl border border-slate-200 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={verificationLoading}
                onClick={confirmResolution}
                className="rounded-xl bg-emerald-700 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {verificationLoading
                  ? "Confirming..."
                  : "Yes, Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute right-5 top-5 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          >
            <FiX size={24} />
          </button>

          <img
            src={previewImage}
            alt="Enlarged verification evidence"
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}