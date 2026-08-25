import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface UserProfile {
  id: string;
  full_name?: string;
  name?: string;
  email?: string;
  role: "resident" | "manager" | "admin" | string;
  status?: string;
}

interface ManagerStats {
  totalReports: number;
  pendingReports: number;
  ongoingReports: number;
  resolvedReports: number;
  rejectedReports: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"users" | "manager_ops">("users");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"resident" | "manager" | "admin">("resident");

  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [reportsList, setReportsList] = useState<any[]>([]);

  const [managerStats, setManagerStats] = useState<ManagerStats>({
    totalReports: 0,
    pendingReports: 0,
    ongoingReports: 0,
    resolvedReports: 0,
    rejectedReports: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setErrorMessage(null);
      const { data, error } = await supabase.from("profiles").select("*");

      if (error) throw error;
      setUsers((data as UserProfile[]) || []);
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setErrorMessage(err.message || "Failed to load profiles table.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchManagerOps = async () => {
    try {
      setLoadingStats(true);
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setReportsList(data);
        setManagerStats({
          totalReports: data.length,
          pendingReports: data.filter((r) => r.status?.toLowerCase() === "pending").length,
          ongoingReports: data.filter((r) =>
            ["ongoing", "on-going", "active", "in progress"].includes(r.status?.toLowerCase())
          ).length,
          resolvedReports: data.filter((r) =>
            ["resolved", "closed", "cleared"].includes(r.status?.toLowerCase())
          ).length,
          rejectedReports: data.filter((r) => r.status?.toLowerCase() === "rejected").length,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === "manager_ops") {
      fetchManagerOps();
    }
  }, [activeTab]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      const newProfile = {
        id: crypto.randomUUID(),
        full_name: newName || "New User",
        email: newEmail,
        // Send strictly lowercased role to satisfy 'profiles_role_check'
        role: newRole.toLowerCase(),
      };

      const { data, error } = await supabase.from("profiles").insert([newProfile]).select();

      if (error) throw error;

      if (data && data.length > 0) {
        setUsers((prev) => [...prev, data[0] as UserProfile]);
      } else {
        await fetchUsers();
      }

      setShowAddModal(false);
      setNewName("");
      setNewEmail("");
      setNewRole("resident");
    } catch (err: any) {
      alert("Error adding user profile: " + err.message);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const { error } = await supabase.from("profiles").delete().eq("id", deleteUserId);
      if (error) throw error;

      setUsers((prev) => prev.filter((u) => u.id !== deleteUserId));
      setDeleteUserId(null);
    } catch (err: any) {
      alert("Error deleting profile: " + err.message);
    }
  };

  const totalAccounts = users.length;
  const totalResidents = users.filter((u) => u.role?.toLowerCase() === "resident").length;
  const totalManagers = users.filter((u) => u.role?.toLowerCase() === "manager").length;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center gap-2">
          <span className="text-xl font-black tracking-wider text-emerald-400">CERMS</span>
          <span className="text-[10px] bg-rose-600 px-2 py-0.5 rounded-full font-bold uppercase text-white">
            Admin
          </span>
        </div>

        <nav className="p-4 space-y-1 text-xs font-bold flex-1">
          <button
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === "users" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50"
            }`}
          >
            👥 User Management
          </button>
          <button
            onClick={() => setActiveTab("manager_ops")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === "manager_ops" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50"
            }`}
          >
            📊 View Manager Operations
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => navigate("/login")}
            className="w-full py-2 px-3 bg-slate-950 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {activeTab === "users" ? "Admin Dashboard" : "Manager Operations View"}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {activeTab === "users"
                ? "Manage registered system accounts, create users, and remove permissions."
                : "Read-only overview of live barangay manager operations and dispatch progress."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "users" && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                + Add New User
              </button>
            )}
          </div>
        </header>

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
            ⚠️ Database Alert: {errorMessage}
          </div>
        )}

        {activeTab === "users" ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-3xl font-black text-slate-900">{totalAccounts}</span>
                <p className="text-xs font-bold text-slate-400 mt-1">Total System Accounts</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-3xl font-black text-emerald-600">{totalResidents}</span>
                <p className="text-xs font-bold text-slate-400 mt-1">Registered Residents</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-3xl font-black text-blue-600">{totalManagers}</span>
                <p className="text-xs font-bold text-slate-400 mt-1">Barangay Managers / Officials</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  System Users & Access Control
                </h3>
              </div>

              {loadingUsers ? (
                <div className="p-8 text-center text-xs font-semibold text-slate-400">
                  Loading user records...
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-xs font-medium text-slate-400">
                  No accounts stored in profiles table. Click "+ Add New User" to populate data.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                        <th className="px-5 py-3.5">User Name</th>
                        <th className="px-5 py-3.5">Email Address</th>
                        <th className="px-5 py-3.5">Current Role</th>
                        <th className="px-5 py-3.5">Account Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-900">
                            {user.full_name || user.name || "Unnamed Account"}
                          </td>
                          <td className="px-5 py-4 text-slate-600 font-mono">
                            {user.email || "N/A"}
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200 capitalize">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {user.status || "Active"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => setDeleteUserId(user.id)}
                              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 transition-all cursor-pointer"
                            >
                              Delete Account
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            {loadingStats ? (
              <div className="p-8 text-center text-xs font-semibold text-slate-400 bg-white rounded-2xl border border-slate-200">
                Fetching live manager metrics...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-3xl font-black text-slate-900">
                      {managerStats.totalReports}
                    </span>
                    <p className="text-xs font-bold text-slate-400 mt-1">Total Reports Received</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-3xl font-black text-amber-600">
                      {managerStats.pendingReports}
                    </span>
                    <p className="text-xs font-bold text-slate-400 mt-1">Pending Review</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-3xl font-black text-blue-600">
                      {managerStats.ongoingReports}
                    </span>
                    <p className="text-xs font-bold text-slate-400 mt-1">Active Dispatches</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-3xl font-black text-emerald-600">
                      {managerStats.resolvedReports}
                    </span>
                    <p className="text-xs font-bold text-slate-400 mt-1">Closed / Cleared</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Live Barangay Manager Operations
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      Real-Time Feed
                    </span>
                  </div>

                  {reportsList.length === 0 ? (
                    <div className="p-8 text-center text-xs font-medium text-slate-400">
                      No active reports recorded in system logs.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                            <th className="px-5 py-3.5">Incident / Report ID</th>
                            <th className="px-5 py-3.5">Title / Type</th>
                            <th className="px-5 py-3.5">Status</th>
                            <th className="px-5 py-3.5">Date Logged</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold">
                          {reportsList.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-5 py-4 font-mono text-slate-500">
                                #{item.id?.slice(0, 8)}
                              </td>
                              <td className="px-5 py-4 text-slate-900 font-bold">
                                {item.title || item.category || "General Report"}
                              </td>
                              <td className="px-5 py-4">
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200 capitalize">
                                  {item.status || "Pending"}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-slate-500 font-mono">
                                {item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Live Operational Overview
                  </h3>
                  <p className="text-xs text-slate-500">
                    This panel presents live metrics and dispatch progress handled by the Barangay Operations Manager. Admin access allows view-only auditing without disrupting manager operations.
                  </p>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-600">
                    Active Barangay Manager Operations Status: <strong className="text-emerald-700 font-bold">Operational</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-slate-900">Add New User</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Maria Santos"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. user@cerms.test"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Assign Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "resident" | "manager" | "admin")}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="resident">Resident</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteUserId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Confirm Deletion</h3>
            <p className="text-xs text-slate-600 font-medium">
              Are you sure you want to delete this user profile? This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteUserId(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}