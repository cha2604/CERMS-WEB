import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiEdit3 } from "react-icons/fi";
import { supabase } from "../../lib/supabase";
import { getUserDrafts, deleteDraft, type ReportDraft } from "../../lib/DraftQueries";
import ResidentLayout from "../../pages/resident/Layout";

export default function DraftReports() {
  const navigate = useNavigate();

  const [drafts, setDrafts] = useState<ReportDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/login");
          return;
        }

        const data = await getUserDrafts(user.id);
        if (isMounted) setDrafts(data);
      } catch (err) {
        console.error("Failed to load drafts:", err);
        if (isMounted) setErrorMessage("Couldn't load your drafts.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  async function handleDelete(id: string) {
    try {
      await deleteDraft(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Failed to delete draft:", err);
    }
  }

  return (
    <ResidentLayout title="Draft Reports">
      <div className="px-5 py-5">
        {errorMessage && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          {loading &&
            [1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-white/60" />
            ))}

          {!loading && drafts.length === 0 && (
            <div className="rounded-xl bg-white p-6 text-center text-sm text-gray-500">
              No saved drafts yet.
            </div>
          )}

          {!loading &&
            drafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">
                    {draft.category || "Untitled draft"}
                  </p>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {draft.description || "No description yet"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Last edited{" "}
                    {new Date(draft.updated_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => navigate(`/report/new?draft=${draft.id}`)}
                    aria-label="Resume draft"
                    className="rounded-full bg-green-50 p-2.5 text-green-700 transition hover:bg-green-100"
                  >
                    <FiEdit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(draft.id)}
                    aria-label="Delete draft"
                    className="rounded-full bg-red-50 p-2.5 text-red-600 transition hover:bg-red-100"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </ResidentLayout>
  );
}