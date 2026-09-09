import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface UserProfile {
  id: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
}

interface ArchivedProfile {
  id: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
  archived_at: string;
}

type ActiveTab = "people" | "archive";

export default function Users() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [archivedUsers, setArchivedUsers] = useState<
    ArchivedProfile[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] =
    useState(true);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] =
    useState<ActiveTab>("people");

  const [selectedUser, setSelectedUser] =
    useState<UserProfile | null>(null);

  const [violationReason, setViolationReason] =
    useState("");

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    await Promise.all([
      fetchUsers(),
      fetchArchivedUsers(),
    ]);
  }

  async function fetchUsers() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("role", "admin")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const activeProfiles =
        (data as UserProfile[]) || [];

      const { data: archivedData, error: archivedError } =
        await supabase
          .from("archived_profiles")
          .select("id");

      if (archivedError) {
        throw archivedError;
      }

      const archivedIds = new Set(
        (archivedData || []).map(
          (item) => item.id
        )
      );

      const filteredActiveUsers =
        activeProfiles.filter(
          (user) =>
            !archivedIds.has(user.id)
        );

      setUsers(filteredActiveUsers);
    } catch (err) {
      console.error(
        "Error fetching users:",
        err
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchArchivedUsers() {
    try {
      setArchiveLoading(true);

      const { data, error } =
        await supabase
          .from("archived_profiles")
          .select("*")
          .order("archived_at", {
            ascending: false,
          });

      if (error) {
        throw error;
      }

      setArchivedUsers(
        (data as ArchivedProfile[]) || []
      );
    } catch (err) {
      console.error(
        "Error fetching archived users:",
        err
      );
    } finally {
      setArchiveLoading(false);
    }
  }

  const handleDeleteUser = async (
    user: UserProfile
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${
        user.full_name ||
        "this resident"
      }? The account will be moved to Archive.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from("archived_profiles")
          .upsert({
            id: user.id,
            full_name:
              user.full_name,
            role: user.role,
            created_at:
              user.created_at,
            archived_at:
              new Date().toISOString(),
          });

      if (error) {
        throw error;
      }

      setUsers((prev) =>
        prev.filter(
          (item) =>
            item.id !== user.id
        )
      );

      await fetchArchivedUsers();

      alert(
        `${
          user.full_name ||
          "Resident"
        } has been moved to Archive.`
      );
    } catch (err) {
      console.error(
        "Error archiving user:",
        err
      );

      alert(
        "Failed to archive resident."
      );
    }
  };

  const handleRestoreUser = async (
    user: ArchivedProfile
  ) => {
    const confirmed = window.confirm(
      `Restore ${
        user.full_name ||
        "this resident"
      } to Manage People?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from("archived_profiles")
          .delete()
          .eq("id", user.id);

      if (error) {
        throw error;
      }

      await fetchUsers();
      await fetchArchivedUsers();

      alert(
        `${
          user.full_name ||
          "Resident"
        } has been restored.`
      );
    } catch (err) {
      console.error(
        "Error restoring user:",
        err
      );

      alert(
        "Failed to restore resident."
      );
    }
  };

  const handleSendViolation =
    async () => {
      if (
        !selectedUser ||
        !violationReason.trim()
      ) {
        return;
      }

      try {
        const { error } =
          await supabase
            .from("notifications")
            .insert([
              {
                user_id:
                  selectedUser.id,
                title:
                  "Warning: Violation Issued",
                message:
                  violationReason,
                type: "violation",
                created_at:
                  new Date().toISOString(),
              },
            ]);

        if (error) {
          throw error;
        }

        alert(
          `Violation sent to ${
            selectedUser.full_name ||
            "resident"
          }.`
        );

        setIsModalOpen(false);
        setViolationReason("");
        setSelectedUser(null);
      } catch (err) {
        console.error(
          "Error sending violation:",
          err
        );

        alert(
          "Failed to send violation notification."
        );
      }
    };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const filteredUsers =
    users.filter((user) => {
      const query = search
        .trim()
        .toLowerCase();

      const name =
        user.full_name?.toLowerCase() ||
        "";

      const id =
        user.id.toLowerCase();

      return (
        name.includes(query) ||
        id.includes(query)
      );
    });

  const filteredArchivedUsers =
    archivedUsers.filter((user) => {
      const query = search
        .trim()
        .toLowerCase();

      const name =
        user.full_name?.toLowerCase() ||
        "";

      const id =
        user.id.toLowerCase();

      return (
        name.includes(query) ||
        id.includes(query)
      );
    });

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 p-5 flex flex-col shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-lg shadow-md">
            C
          </div>

          <div>
            <h2 className="font-extrabold text-slate-900 text-base leading-none">
              CERMS
            </h2>

            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mt-1">
              WASTE MONITORING
            </p>
          </div>
        </div>

        <nav className="space-y-2 text-sm font-bold flex-1">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/dashboard"
              )
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/dashboard"
              )
            }
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Geotagged Map
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/dashboard"
              )
            }
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

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      "people"
                    )
                  }
                  className={`text-xl font-black transition-all ${
                    activeTab === "people"
                      ? "text-slate-900"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  Manage People
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      "archive"
                    )
                  }
                  className={`text-xl font-black transition-all ${
                    activeTab === "archive"
                      ? "text-emerald-800"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  Archive
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-1">
                {activeTab ===
                "people"
                  ? "Overview of registered residents"
                  : "Archived resident accounts"}
              </p>
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder={
                activeTab === "people"
                  ? "Search residents..."
                  : "Search archived residents..."
              }
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {activeTab ===
            "people" && (
            <div className="p-6">
              {loading ? (
                <div className="py-12 text-center text-sm font-semibold text-slate-400">
                  Loading registered residents...
                </div>
              ) : filteredUsers.length ===
                0 ? (
                <div className="py-12 text-center text-sm font-semibold text-slate-400">
                  No registered residents found.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                        <th className="py-3 px-4">
                          Full Name
                        </th>

                        <th className="py-3 px-4">
                          User ID
                        </th>

                        <th className="py-3 px-4">
                          Role
                        </th>

                        <th className="py-3 px-4">
                          Registered Date
                        </th>

                        <th className="py-3 px-4 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map(
                        (user) => (
                          <tr
                            key={user.id}
                            className="hover:bg-slate-50"
                          >
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {user.full_name ||
                                "Unnamed Resident"}
                            </td>

                            <td className="py-3 px-4 font-mono text-slate-500">
                              {user.id.slice(
                                0,
                                8
                              )}
                              ...
                            </td>

                            <td className="py-3 px-4">
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                {user.role ||
                                  "resident"}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-slate-500">
                              {new Date(
                                user.created_at
                              ).toLocaleDateString()}
                            </td>

                            <td className="py-3 px-4 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUser(
                                    user
                                  );
                                  setIsModalOpen(
                                    true
                                  );
                                }}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                              >
                                Send Violation
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteUser(
                                    user
                                  )
                                }
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab ===
            "archive" && (
            <div className="p-6">
              {archiveLoading ? (
                <div className="py-12 text-center text-sm font-semibold text-slate-400">
                  Loading archived residents...
                </div>
              ) : filteredArchivedUsers.length ===
                0 ? (
                <div className="py-12 text-center text-sm font-semibold text-slate-400">
                  No archived residents found.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                        <th className="py-3 px-4">
                          Full Name
                        </th>

                        <th className="py-3 px-4">
                          User ID
                        </th>

                        <th className="py-3 px-4">
                          Role
                        </th>

                        <th className="py-3 px-4">
                          Registered Date
                        </th>

                        <th className="py-3 px-4">
                          Archived Date
                        </th>

                        <th className="py-3 px-4 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredArchivedUsers.map(
                        (user) => (
                          <tr
                            key={user.id}
                            className="hover:bg-slate-50"
                          >
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {user.full_name ||
                                "Unnamed Resident"}
                            </td>

                            <td className="py-3 px-4 font-mono text-slate-500">
                              {user.id.slice(
                                0,
                                8
                              )}
                              ...
                            </td>

                            <td className="py-3 px-4">
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                                {user.role ||
                                  "resident"}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-slate-500">
                              {new Date(
                                user.created_at
                              ).toLocaleDateString()}
                            </td>

                            <td className="py-3 px-4 text-slate-500">
                              {new Date(
                                user.archived_at
                              ).toLocaleDateString()}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRestoreUser(
                                    user
                                  )
                                }
                                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                              >
                                Restore
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {isModalOpen &&
        selectedUser && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
              <h3 className="text-lg font-black text-slate-900">
                Send Violation Warning
              </h3>

              <p className="text-xs text-slate-500">
                Sending official warning notice
                to{" "}
                <span className="font-bold text-slate-800">
                  {selectedUser.full_name ||
                    "Resident"}
                </span>
                .
              </p>

              <textarea
                value={
                  violationReason
                }
                onChange={(e) =>
                  setViolationReason(
                    e.target.value
                  )
                }
                placeholder="Enter violation details or reason for suspicious activity..."
                className="w-full h-28 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none resize-none"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(
                      false
                    );
                    setViolationReason(
                      ""
                    );
                    setSelectedUser(
                      null
                    );
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleSendViolation
                  }
                  disabled={
                    !violationReason.trim()
                  }
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm &amp; Send
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}