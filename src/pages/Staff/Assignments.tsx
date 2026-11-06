import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useNavigate,
} from "react-router-dom";
import {
  FiMapPin,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

interface Assignment {
  id: string;
  assignment_status: string;
  assigned_at: string;
  notes: string | null;
  reports: {
    id: string;
    title: string;
    waste_type: string;
    severity: string | null;
    status: string;
    location_name: string | null;
    image_urls: string[] | null;
  } | null;
}

export default function Assignments() {
  const navigate =
    useNavigate();

  const [
    assignments,
    setAssignments,
  ] =
    useState<
      Assignment[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const loadAssignments =
    useCallback(async () => {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from(
          "report_assignments"
        )
        .select(
          `
            id,
            assignment_status,
            assigned_at,
            notes,
            reports (
              id,
              title,
              waste_type,
              severity,
              status,
              location_name,
              image_urls
            )
          `
        )
        .eq(
          "staff_id",
          user.id
        )
        .neq(
          "assignment_status",
          "Resolved"
        )
        .order(
          "assigned_at",
          {
            ascending:
              false,
          }
        );

      if (!error) {
        setAssignments(
          (data ||
            []) as unknown as Assignment[]
        );
      }

      setLoading(false);
    }, []);

  useEffect(() => {
    loadAssignments();

    const channel =
      supabase
        .channel(
          "staff-assignments"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "report_assignments",
          },
          loadAssignments
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [loadAssignments]);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-black text-slate-900">
        My Assignments
      </h1>

      <p className="mt-1 text-sm font-medium text-slate-500">
        Reports assigned to you by the barangay administrator.
      </p>

      {loading ? (
        <div className="py-20 text-center text-sm font-bold text-slate-400">
          Loading assignments...
        </div>
      ) : (
        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {assignments.map(
            (assignment) => (
              <button
                key={
                  assignment.id
                }
                type="button"
                onClick={() =>
                  navigate(
                    `/assignment/${assignment.id}`
                  )
                }
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="h-44 bg-slate-100">
                  {assignment
                    .reports
                    ?.image_urls?.[0] ? (
                    <img
                      src={
                        assignment
                          .reports
                          .image_urls[0]
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                      No report photo
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-black text-slate-900">
                      {assignment
                        .reports
                        ?.waste_type ||
                        assignment
                          .reports
                          ?.title}
                    </h2>

                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700">
                      {
                        assignment.assignment_status
                      }
                    </span>
                  </div>

                  <div className="mt-3 flex items-start gap-2 text-xs font-semibold text-slate-500">
                    <FiMapPin className="mt-0.5 shrink-0" />

                    <span>
                      {assignment
                        .reports
                        ?.location_name ||
                        "Barangay Tankulan"}
                    </span>
                  </div>

                  {assignment
                    .reports
                    ?.severity && (
                    <p className="mt-4 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Severity:{" "}
                      <span className="text-slate-700">
                        {
                          assignment
                            .reports
                            .severity
                        }
                      </span>
                    </p>
                  )}
                </div>
              </button>
            )
          )}

          {assignments.length ===
            0 && (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <p className="text-sm font-bold text-slate-400">
                No active assignments.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}