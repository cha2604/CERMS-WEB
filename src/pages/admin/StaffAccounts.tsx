import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  FiPlus,
  FiSearch,
  FiUserCheck,
  FiUserX,
  FiX,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

interface StaffProfile {
  id: string;
  full_name: string;
  username: string;
  email: string;
  contact_number: string | null;
  team_name: string;
  position: string | null;
  account_status: string;
  created_at: string;
}

const TEAMS = [
  "Barangay Sanitary Inspection",
  "Solid Waste Management",
  "Barangay Garbage Crew",
];

const EMPTY_FORM = {
  fullName: "",
  surname: "",
  username: "",
  email: "",
  contactNumber: "",
  teamName: "",
  position: "",
};

export default function StaffAccounts() {
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error: loadError } = await supabase
        .from("staff_profiles")
        .select(
          "id, full_name, username, email, contact_number, team_name, position, account_status, created_at"
        )
        .order("created_at", { ascending: false });

      if (loadError) {
        throw loadError;
      }

      setStaff((data || []) as StaffProfile[]);
    } catch (loadError) {
      console.error("Failed to load staff:", loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load staff accounts."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const handleContactChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 11);

    setForm((current) => ({
      ...current,
      contactNumber: digitsOnly,
    }));
  };

  const createStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (
      !form.fullName.trim() ||
      !form.surname.trim() ||
      !form.username.trim() ||
      !form.email.trim() ||
      !form.contactNumber.trim() ||
      !form.teamName
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (!/^\d{11}$/.test(form.contactNumber)) {
      setError("Contact number must contain exactly 11 digits.");
      return;
    }

    try {
      setCreating(true);

      const initialPassword = form.surname.trim();

      const { data, error: functionError } =
        await supabase.functions.invoke("create-staff", {
          body: {
            fullName: form.fullName.trim(),
            surname: initialPassword,
            username: form.username.trim().toLowerCase(),
            email: form.email.trim().toLowerCase(),
            contactNumber: form.contactNumber,
            teamName: form.teamName,
            position: form.position.trim(),
          },
        });

      if (functionError) {
        let detailedMessage =
          functionError.message || "Failed to create staff account.";

        const context =
          "context" in functionError ? functionError.context : null;

        if (context instanceof Response) {
          try {
            const responseText = await context.clone().text();

            if (responseText) {
              try {
                const parsed = JSON.parse(responseText);
                detailedMessage =
                  parsed?.error ||
                  parsed?.message ||
                  detailedMessage;
              } catch {
                detailedMessage = responseText;
              }
            }
          } catch (responseError) {
            console.error(
              "Failed to read Edge Function response:",
              responseError
            );
          }
        }

        throw new Error(detailedMessage);
      }

      if (data?.error || data?.success === false) {
        throw new Error(data.error || "Failed to create staff account.");
      }

      setForm(EMPTY_FORM);
      setModalOpen(false);
      setMessage(
        `Staff account created successfully. Initial password: ${initialPassword}`
      );

      await loadStaff();
    } catch (createError) {
      console.error("Failed to create staff:", createError);

      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create staff account."
      );
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (staffMember: StaffProfile) => {
    try {
      setError("");
      setMessage("");

      const nextStatus =
        staffMember.account_status === "Active" ? "Inactive" : "Active";

      const { error: updateError } = await supabase
        .from("staff_profiles")
        .update({
          account_status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", staffMember.id);

      if (updateError) {
        throw updateError;
      }

      setMessage(
        nextStatus === "Active"
          ? "Staff account activated."
          : "Staff account disabled."
      );

      await loadStaff();
    } catch (updateError) {
      console.error("Failed to update staff status:", updateError);

      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update staff account."
      );
    }
  };

  const filtered = staff.filter((item) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      item.full_name.toLowerCase().includes(query) ||
      item.username.toLowerCase().includes(query) ||
      item.email.toLowerCase().includes(query) ||
      item.team_name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Staff Personnel
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Create and manage CERMS staff accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm(EMPTY_FORM);
            setError("");
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-900"
        >
          <FiPlus />
          Add Staff
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          {message}
        </div>
      )}

      {error && !modalOpen && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search staff..."
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm font-bold text-slate-400">
            Loading staff...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-black text-slate-600">
              No staff accounts found.
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400">
              Create a staff account before assigning personnel to reports.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Staff</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Team</th>
                  <th className="px-5 py-4">Position</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-black text-slate-900">
                        {item.full_name}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-400">
                        @{item.username}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        {item.email}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-xs font-bold text-slate-700">
                      {item.contact_number || "Not provided"}
                    </td>

                    <td className="px-5 py-4 text-xs font-bold text-slate-700">
                      {item.team_name}
                    </td>

                    <td className="px-5 py-4 text-xs font-semibold text-slate-600">
                      {item.position || "Personnel"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black ${
                          item.account_status === "Active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.account_status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => toggleStatus(item)}
                        className={`flex items-center gap-2 text-xs font-black ${
                          item.account_status === "Active"
                            ? "text-rose-600"
                            : "text-emerald-700"
                        }`}
                      >
                        {item.account_status === "Active" ? (
                          <FiUserX />
                        ) : (
                          <FiUserCheck />
                        )}
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
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-5">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Create Staff Account
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Only active staff accounts can be assigned to reports.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setError("");
                }}
                className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              >
                <FiX />
              </button>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={createStaff} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  placeholder="Full Name"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Surname (Initial Password)
                </label>
                <input
                  type="text"
                  value={form.surname}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      surname: event.target.value,
                    }))
                  }
                  placeholder="Surname"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                />
                <p className="mt-1.5 text-[10px] font-medium text-slate-400">
                  The surname entered here will be used as the staff member's
                  initial password.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Username
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  placeholder="Username"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="Email Address"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Contact Number
                  </label>
                  <span
                    className={`text-[10px] font-bold ${
                      form.contactNumber.length === 11
                        ? "text-emerald-600"
                        : "text-slate-400"
                    }`}
                  >
                    {form.contactNumber.length}/11
                  </span>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={11}
                  value={form.contactNumber}
                  onChange={(event) =>
                    handleContactChange(event.target.value)
                  }
                  placeholder="09XXXXXXXXX"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                />
                <p className="mt-1.5 text-[10px] font-medium text-slate-400">
                  Numbers only, exactly 11 digits.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Response Team
                </label>
                <select
                  value={form.teamName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      teamName: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="">Select Response Team</option>
                  {TEAMS.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Position
                </label>
                <input
                  type="text"
                  value={form.position}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      position: event.target.value,
                    }))
                  }
                  placeholder="Position"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                The staff member's surname will automatically become their
                initial password. They can change it later in their Profile.
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setError("");
                  }}
                  disabled={creating}
                  className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 rounded-xl bg-emerald-800 py-3 text-sm font-black text-white transition hover:bg-emerald-900 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}