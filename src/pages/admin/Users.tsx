import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  contact_number: string | null;
  address: string | null;
  role: string | null;
  created_at: string;
}

interface StaffProfile {
  id: string;
  full_name: string;
  username: string;
  email: string;
  contact_number: string | null;
  team_name: string;
  account_status: string;
  created_at: string;
}

export default function Users() {

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [staff, setStaff] = useState<StaffProfile[]>([]);

  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(true);

  const [userError, setUserError] = useState("");
  const [staffError, setStaffError] = useState("");
  const [staffMessage, setStaffMessage] = useState("");

  const [search, setSearch] = useState("");

  const [selectedUser, setSelectedUser] =
    useState<UserProfile | null>(null);

  const [noticeMessage, setNoticeMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    void fetchUsers();
    void fetchStaff();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      setUserError("");

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, contact_number, address, role, created_at"
        )
        .neq("role", "admin")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const {
        data: archivedData,
        error: archivedError,
      } = await supabase
        .from("archived_profiles")
        .select("id");

      if (archivedError) {
        throw archivedError;
      }

      const archivedIds = new Set(
        (archivedData || []).map((item) => item.id)
      );

      const activeUsers = ((data || []) as UserProfile[]).filter(
        (user) =>
          user.role?.toLowerCase() !== "admin" &&
          user.role?.toLowerCase() !== "staff" &&
          !archivedIds.has(user.id)
      );

      setUsers(activeUsers);
    } catch (error) {
      console.error("Error fetching user accounts:", error);

      setUserError(
        error instanceof Error
          ? error.message
          : "Failed to load user accounts."
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchStaff() {
    try {
      setStaffLoading(true);
      setStaffError("");

      const { data, error } = await supabase
        .from("staff_profiles")
        .select(
          "id, full_name, username, email, contact_number, team_name, account_status, created_at"
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setStaff((data || []) as StaffProfile[]);
    } catch (error) {
      console.error("Error fetching staff accounts:", error);

      setStaffError(
        error instanceof Error
          ? error.message
          : "Failed to load staff accounts."
      );
    } finally {
      setStaffLoading(false);
    }
  }

  const handleToggleStaff = async (
    staffMember: StaffProfile
  ) => {
    const nextStatus =
      staffMember.account_status === "Active"
        ? "Inactive"
        : "Active";

    const confirmed = window.confirm(
      `Are you sure you want to ${
        nextStatus === "Active" ? "activate" : "disable"
      } ${staffMember.full_name}'s account?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setStaffError("");
      setStaffMessage("");

      const { error } = await supabase
        .from("staff_profiles")
        .update({
          account_status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", staffMember.id);

      if (error) {
        throw error;
      }

      setStaff((current) =>
        current.map((item) =>
          item.id === staffMember.id
            ? {
                ...item,
                account_status: nextStatus,
              }
            : item
        )
      );

      setStaffMessage(
        nextStatus === "Active"
          ? `${staffMember.full_name}'s account has been activated.`
          : `${staffMember.full_name}'s account has been disabled.`
      );
    } catch (error) {
      console.error("Failed to update staff account:", error);

      setStaffError(
        error instanceof Error
          ? error.message
          : "Failed to update staff account."
      );
    }
  };

  const handleArchiveUser = async (user: UserProfile) => {
    const confirmed = window.confirm(
      `Are you sure you want to move ${
        user.full_name || "this user"
      } to Archive?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from("archived_profiles")
        .upsert({
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          contact_number: user.contact_number,
          address: user.address,
          role: user.role,
          created_at: user.created_at,
          archived_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      setUsers((current) =>
        current.filter((item) => item.id !== user.id)
      );

      alert(
        `${user.full_name || "User"} has been moved to Archive.`
      );
    } catch (error) {
      console.error("Error archiving user account:", error);

      alert("Failed to move user account to Archive.");
    }
  };

  const handleSendNotice = async () => {
    if (!selectedUser || !noticeMessage.trim()) {
      return;
    }

    try {
      const { error } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: selectedUser.id,
            title: "Notice from the Barangay Office",
            message: noticeMessage.trim(),
            type: "admin_message",
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) {
        throw error;
      }

      alert(
        `Notice sent to ${selectedUser.full_name || "user"}.`
      );

      setIsModalOpen(false);
      setNoticeMessage("");
      setSelectedUser(null);
    } catch (error) {
      console.error("Error sending notice:", error);

      alert("Failed to send the notification.");
    }
  };


  const extractArea = (address: string | null) => {
    if (!address) {
      return "Not provided";
    }

    return address.split(",")[0] || "Not provided";
  };

  const normalizedSearch = search.trim().toLowerCase();

  const filteredStaff = staff.filter((item) => {
    return (
      item.full_name?.toLowerCase().includes(normalizedSearch) ||
      item.username?.toLowerCase().includes(normalizedSearch) ||
      item.email?.toLowerCase().includes(normalizedSearch) ||
      item.contact_number?.toLowerCase().includes(normalizedSearch) ||
      item.team_name?.toLowerCase().includes(normalizedSearch)
    );
  });

  const filteredUsers = users.filter((user) => {
    const name = user.full_name?.toLowerCase() || "";
    const email = user.email?.toLowerCase() || "";
    const contact = user.contact_number?.toLowerCase() || "";
    const address = user.address?.toLowerCase() || "";

    return (
      name.includes(normalizedSearch) ||
      email.includes(normalizedSearch) ||
      contact.includes(normalizedSearch) ||
      address.includes(normalizedSearch)
    );
  });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">
              CERMS / Management
            </span>
          </div>

          <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            Accounts
          </h1>

          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Manage staff and user accounts.
          </p>
        </div>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search accounts..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:w-72 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
        />
      </header>

      {staffMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {staffMessage}
        </div>
      )}

      {staffError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {staffError}
        </div>
      )}

      {userError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {userError}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Staff Accounts
            </h2>

            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Manage the accounts of assigned barangay personnel.
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {staff.length} {staff.length === 1 ? "Staff" : "Staff Members"}
          </span>
        </div>

        {staffLoading ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-400">
            Loading staff accounts...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              No staff accounts found.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Staff accounts created through Staff Personnel will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                  <th className="whitespace-nowrap px-4 py-3 font-extrabold">
                    Staff
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 font-extrabold">
                    Email
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 font-extrabold">
                    Contact Number
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 font-extrabold">
                    Team
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 font-extrabold">
                    Registered Date
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-center font-extrabold">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-right font-extrabold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredStaff.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-extrabold text-slate-900 dark:text-white">
                        {item.full_name}
                      </p>

                      <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                        @{item.username}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                      {item.email}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                      {item.contact_number || "Not provided"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                      {item.team_name || "Not assigned"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[10px] font-extrabold ${
                          item.account_status === "Active"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {item.account_status}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void handleToggleStaff(item)}
                        className={`rounded-lg px-3 py-1.5 text-[10px] font-extrabold transition-colors ${
                          item.account_status === "Active"
                            ? "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-950"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950"
                        }`}
                      >
                        {item.account_status === "Active"
                          ? "Disable"
                          : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              User Accounts
            </h2>

            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Manage registered user accounts in Barangay Tankulan.
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {users.length} {users.length === 1 ? "User" : "Users"}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-400">
            Loading user accounts...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-400">
            No user accounts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                  <th className="whitespace-nowrap px-4 py-3 font-extrabold">
                    Name
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 font-extrabold">
                    Email
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 font-extrabold">
                    Contact Number
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 font-extrabold">
                    Area
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 font-extrabold">
                    Registered Date
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-right font-extrabold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-extrabold text-slate-900 dark:text-white">
                      {user.full_name || "Unnamed User"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                      {user.email || "Not provided"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                      {user.contact_number || "Not provided"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {extractArea(user.address)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsModalOpen(true);
                          }}
                          className="rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-extrabold text-white transition-colors hover:bg-amber-600"
                        >
                          Send Notice
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleArchiveUser(user)}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-[10px] font-extrabold text-white transition-colors hover:bg-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Send Notice to User
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                This notice will appear in the notifications of{" "}
                <span className="font-extrabold text-slate-800 dark:text-white">
                  {selectedUser.full_name || "this user"}
                </span>
                .
              </p>
            </div>

            <textarea
              value={noticeMessage}
              onChange={(event) =>
                setNoticeMessage(event.target.value)
              }
              placeholder="Write the message you want the user to receive..."
              className="h-32 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setNoticeMessage("");
                  setSelectedUser(null);
                }}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSendNotice()}
                disabled={!noticeMessage.trim()}
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
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