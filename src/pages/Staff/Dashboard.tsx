import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useNavigate,
} from "react-router-dom";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiEye,
  FiLoader,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

interface Assignment {
  id: string;
  assignment_status: string;
  assigned_at: string;
  reports: {
    id: string;
    title: string;
    waste_type: string;
    severity: string | null;
    status: string;
    location_name: string | null;
    created_at: string;
  } | null;
}

function getStatusClass(
  status: string
) {
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

export default function StaffDashboard() {
  const navigate =
    useNavigate();

  const [
    assignments,
    setAssignments,
  ] =
    useState<Assignment[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const loadAssignments =
    useCallback(
      async () => {
        try {
          const {
            data: {
              user,
            },
          } =
            await supabase.auth.getUser();

          if (!user) {
            return;
          }

          const {
            data,
            error,
          } =
            await supabase
              .from(
                "report_assignments"
              )
              .select(
                `
                  id,
                  assignment_status,
                  assigned_at,
                  reports (
                    id,
                    title,
                    waste_type,
                    severity,
                    status,
                    location_name,
                    created_at
                  )
                `
              )
              .eq(
                "staff_id",
                user.id
              )
              .order(
                "assigned_at",
                {
                  ascending:
                    false,
                }
              );

          if (error) {
            throw error;
          }

          setAssignments(
            (data ||
              []) as unknown as Assignment[]
          );
        } catch (
          loadError
        ) {
          console.error(
            "Failed to load assignments:",
            loadError
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    loadAssignments();

    const channel =
      supabase
        .channel(
          "staff-dashboard"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "report_assignments",
          },
          () => {
            loadAssignments();
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
          },
          () => {
            loadAssignments();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    loadAssignments,
  ]);

  const assignedCount =
    assignments.filter(
      (item) =>
        item.assignment_status ===
        "Assigned"
    ).length;

  const ongoingCount =
    assignments.filter(
      (item) =>
        item.assignment_status ===
        "Ongoing"
    ).length;

  const returnedCount =
    assignments.filter(
      (item) =>
        item.assignment_status ===
          "Returned" ||
        item.assignment_status ===
          "Returned for Action"
    ).length;

  const verificationCount =
    assignments.filter(
      (item) =>
        item.assignment_status ===
        "For Verification"
    ).length;

  const resolvedCount =
    assignments.filter(
      (item) =>
        item.assignment_status ===
        "Resolved"
    ).length;

  const activeAssignments =
    assignments.filter(
      (item) =>
        item.assignment_status !==
        "Resolved"
    );

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <FiLoader className="animate-spin text-emerald-700" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div>
        <h1 className="text-2xl font-black text-slate-900">
          Staff Dashboard
        </h1>

        <p className="mt-1 text-sm font-medium text-slate-500">
          View and manage the waste reports assigned to you.
        </p>
      </div>

      {returnedCount >
        0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <FiAlertCircle className="mt-0.5 shrink-0 text-rose-600" />

          <div>
            <p className="text-sm font-black text-rose-800">
              Action Required
            </p>

            <p className="mt-1 text-xs font-semibold text-rose-700">
              You have{" "}
              {
                returnedCount
              }{" "}
              report
              {returnedCount !==
              1
                ? "s"
                : ""}{" "}
              returned by the administrator for additional action.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <FiClipboard className="text-amber-600" />

          <p className="mt-4 text-3xl font-black text-slate-900">
            {
              assignedCount
            }
          </p>

          <p className="text-xs font-bold text-slate-500">
            Assigned
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <FiClock className="text-blue-600" />

          <p className="mt-4 text-3xl font-black text-slate-900">
            {
              ongoingCount
            }
          </p>

          <p className="text-xs font-bold text-slate-500">
            Ongoing
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <FiAlertCircle className="text-rose-600" />

          <p className="mt-4 text-3xl font-black text-rose-900">
            {
              returnedCount
            }
          </p>

          <p className="text-xs font-bold text-rose-600">
            Returned
          </p>
        </div>

        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
          <FiEye className="text-violet-600" />

          <p className="mt-4 text-3xl font-black text-violet-900">
            {
              verificationCount
            }
          </p>

          <p className="text-xs font-bold text-violet-600">
            For Verification
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <FiCheckCircle className="text-emerald-600" />

          <p className="mt-4 text-3xl font-black text-emerald-900">
            {
              resolvedCount
            }
          </p>

          <p className="text-xs font-bold text-emerald-600">
            Resolved
          </p>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-black text-slate-900">
              Active Assignments
            </h2>

            <p className="mt-1 text-xs font-medium text-slate-500">
              Reports currently assigned to you.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/assignments"
              )
            }
            className="text-xs font-black text-emerald-700"
          >
            View All
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {activeAssignments
            .slice(
              0,
              5
            )
            .map(
              (
                item
              ) => (
                <button
                  key={
                    item.id
                  }
                  type="button"
                  onClick={() =>
                    navigate(
                      `/assignment/${item.id}`
                    )
                  }
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-900">
                      {item.reports
                        ?.waste_type ||
                        item.reports
                          ?.title ||
                        "Waste Report"}
                    </p>

                    <p className="mt-1 truncate text-xs font-medium text-slate-500">
                      {item.reports
                        ?.location_name ||
                        "Barangay Tankulan"}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${getStatusClass(
                      item.assignment_status
                    )}`}
                  >
                    {
                      item.assignment_status
                    }
                  </span>
                </button>
              )
            )}

          {activeAssignments.length ===
            0 && (
            <div className="py-12 text-center">
              <FiCheckCircle
                size={28}
                className="mx-auto text-emerald-500"
              />

              <p className="mt-3 text-sm font-black text-slate-600">
                No active assignments
              </p>

              <p className="mt-1 text-xs font-medium text-slate-400">
                Your new assignments will appear here.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}