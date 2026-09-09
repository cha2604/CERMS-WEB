import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface ReportItem {
  id: string;
  title: string;
  waste_type: string;
  description: string;
  location_name?: string;
  image_urls?: string[];
  status: "Pending" | "Ongoing" | "On-going" | "Resolved" | "Rejected";
  created_at: string;
}

type ReportFilter = "All" | "Pending" | "On-going" | "Rejected";

export default function MyReports() {
  const navigate = useNavigate();

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReportFilter>("All");

  useEffect(() => {
    async function fetchUserReports() {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from("reports")
            .select("*")
            .eq("user_id", user.id)
            .neq("status", "Resolved")
            .order("created_at", { ascending: false });

          if (data) {
            setReports(data as ReportItem[]);
          }
        }
      } catch (err) {
        console.error("Error fetching reports:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserReports();
  }, []);

  const filteredReports = reports.filter((r) => {
    if (filter === "All") {
      return true;
    }

    if (filter === "On-going") {
      return (
        r.status === "Ongoing" ||
        r.status === "On-going"
      );
    }

    return r.status === filter;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-amber-100 text-amber-800 border-amber-300";

      case "Ongoing":
      case "On-going":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";

      case "Rejected":
        return "bg-rose-100 text-rose-800 border-rose-300";

      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">
            My Reports
          </h1>

          <p className="text-xs text-slate-500 font-semibold">
            Active & Pending Concern Submissions
          </p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-sm">
          <button
            type="button"
            onClick={() => setFilter("All")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              filter === "All"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setFilter("Pending")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              filter === "Pending"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Pending
          </button>

          <button
            type="button"
            onClick={() => setFilter("On-going")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              filter === "On-going"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            On-going
          </button>

          <button
            type="button"
            onClick={() => setFilter("Rejected")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              filter === "Rejected"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">
          Loading reports...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs font-semibold text-slate-400 shadow-sm">
          No reports found in "{filter}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => navigate(`/report/${r.id}`)}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left cursor-pointer"
            >
              <div className="space-y-2">
                {r.image_urls && r.image_urls.length > 0 && (
                  <div className="h-40 w-full overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                    <img
                      src={r.image_urls[0]}
                      alt={r.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono font-bold text-emerald-800">
                    #{r.id.slice(0, 8)}
                  </span>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadgeClass(
                      r.status
                    )}`}
                  >
                    {r.status}
                  </span>
                </div>

                <h3 className="font-extrabold text-sm text-slate-900">
                  {r.waste_type || r.title}
                </h3>

                <p className="text-xs font-semibold text-emerald-800">
                  {r.location_name ||
                    "Barangay Tankulan, Manolo Fortich"}
                </p>

                <p className="text-xs text-slate-500 line-clamp-2">
                  {r.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <p className="text-[11px] font-mono text-slate-400">
                  Submitted:{" "}
                  {new Date(r.created_at).toLocaleDateString()}
                </p>

                <span className="text-xs font-black text-emerald-700">
                  View Details →
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}