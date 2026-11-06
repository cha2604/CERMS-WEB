import {
  useEffect,
  useState,
} from "react";
import {
  useNavigate,
} from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface HistoryItem {
  id: string;
  assignment_status: string;
  assigned_at: string;
  reports: {
    id: string;
    title: string;
    waste_type: string;
    location_name: string | null;
    severity: string | null;
  } | null;
}

export default function History() {
  const navigate =
    useNavigate();

  const [
    records,
    setRecords,
  ] =
    useState<
      HistoryItem[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function loadHistory() {
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
            reports (
              id,
              title,
              waste_type,
              location_name,
              severity
            )
          `
        )
        .eq(
          "staff_id",
          user.id
        )
        .eq(
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
        setRecords(
          (data ||
            []) as unknown as HistoryItem[]
        );
      }

      setLoading(false);
    }

    loadHistory();
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-black text-slate-900">
        Completed Assignments
      </h1>

      <p className="mt-1 text-sm font-medium text-slate-500">
        Waste reports you have completed and that were verified by the administrator.
      </p>

      <div className="mt-7 space-y-4">
        {loading ? (
          <p className="py-16 text-center text-sm font-bold text-slate-400">
            Loading history...
          </p>
        ) : records.length ===
          0 ? (
          <p className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm font-bold text-slate-400">
            No completed assignments yet.
          </p>
        ) : (
          records.map(
            (item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  navigate(
                    `/assignment/${item.id}`
                  )
                }
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-emerald-300"
              >
                <div>
                  <p className="font-black text-slate-900">
                    {item.reports
                      ?.waste_type ||
                      item.reports
                        ?.title}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {item.reports
                      ?.location_name ||
                      "Barangay Tankulan"}
                  </p>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">
                  Resolved
                </span>
              </button>
            )
          )
        )}
      </div>
    </div>
  );
}