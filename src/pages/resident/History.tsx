import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface ReportItem {
  id: string;
  title: string;
  waste_type: string;
  description: string;
  location_name?: string;
  image_urls?: string[];
  status: string;
  remarks?: string;
  created_at: string;
}

export default function History() {
  const [resolvedReports, setResolvedReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("reports")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "Resolved")
            .order("created_at", { ascending: false });

          if (data) setResolvedReports(data as ReportItem[]);
        }
      } catch (err) {
        console.error("Error loading history:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-black text-slate-900">Resolved Reports History</h1>
        <p className="text-xs text-slate-500 font-semibold">
          Completed & Resolved Barangay Tankulan Waste Concerns Log
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">
          Loading resolved history...
        </div>
      ) : resolvedReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs font-semibold text-slate-400 shadow-sm">
          No resolved reports in your history yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resolvedReports.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
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
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                    Resolved ✓
                  </span>
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">{r.waste_type || r.title}</h3>
                <p className="text-xs font-semibold text-emerald-800">
                  {r.location_name || "Barangay Tankulan, Manolo Fortich"}
                </p>
                {r.remarks && (
                  <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-950 font-medium">
                    <span className="font-bold block text-[10px] text-blue-800 uppercase">Barangay Official Remarks:</span>
                    {r.remarks}
                  </div>
                )}
              </div>

              <p className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                Resolved On: {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}