import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface UserProfile {
  id: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
}

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [violationReason, setViolationReason] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("role", "admin")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setUsers(data as UserProfile[]);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this resident profile?")) return;

    try {
      await supabase.from("comments").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;

      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Failed to delete user profile.");
    }
  };

  const handleSendViolation = async () => {
    if (!selectedUser || !violationReason.trim()) return;

    try {
      const { error } = await supabase.from("notifications").insert([
        {
          user_id: selectedUser.id,
          title: "Warning: Violation Issued",
          message: violationReason,
          type: "violation",
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      alert(`Violation sent to ${selectedUser.full_name || "resident"}.`);
      setIsModalOpen(false);
      setViolationReason("");
      setSelectedUser(null);
    } catch (err) {
      console.error("Error sending violation:", err);
      alert("Failed to send violation notification.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const name = u.full_name?.toLowerCase() || "";
    return name.includes(q) || u.id.toLowerCase().includes(q);
  });

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 p-5 flex flex-col shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-lg shadow-md">
            C
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base leading-none">CERMS</h2>
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mt-1">
              WASTE MONITORING
            </p>
          </div>
        </div>

        <nav className="space-y-2 text-sm font-bold flex-1">
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Geotagged Map
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Reports
          </button>

          <button
            type="button"
            className="w-full text-left px-4 py-3 rounded-xl bg-emerald-800 text-white shadow-sm transition-all cursor-pointer"
          >
            People
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-sm font-bold transition-all cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-black text-slate-900">Manage People</h1>
            <p className="text-xs text-slate-500">Overview of registered residents</p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search residents..."
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs shadow-xs focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-400">
            Loading registered residents...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-400">
            No registered residents found.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {u.full_name || "Unnamed Resident"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{u.id.slice(0, 8)}...</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        {u.role || "resident"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setIsModalOpen(true);
                        }}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Send Violation
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-lg font-black text-slate-900">
              Send Violation Warning
            </h3>
            <p className="text-xs text-slate-500">
              Sending official warning notice to{" "}
              <span className="font-bold text-slate-800">{selectedUser.full_name || "Resident"}</span>.
            </p>

            <textarea
              value={violationReason}
              onChange={(e) => setViolationReason(e.target.value)}
              placeholder="Enter violation details or reason for suspicious activity..."
              className="w-full h-28 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none resize-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setViolationReason("");
                  setSelectedUser(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendViolation}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}