import { useEffect, useState, type FormEvent } from "react";
import {
  FiMail,
  FiPhone,
  FiUser,
  FiUsers,
  FiLock,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

interface StaffProfile {
  full_name: string;
  username: string;
  email: string;
  contact_number: string | null;
  team_name: string;
  position: string | null;
  account_status: string;
}

export default function Profile() {
  const [profile, setProfile] =
    useState<StaffProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        const { data, error } = await supabase
          .from("staff_profiles")
          .select(
            "full_name, username, email, contact_number, team_name, position, account_status"
          )
          .eq("id", user.id)
          .single();

        if (error) {
          throw error;
        }

        setProfile(data as StaffProfile);
      } catch (loadError) {
        console.error(
          "Failed to load staff profile:",
          loadError
        );
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  const handlePasswordChange = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setPasswordMessage("");
    setPasswordError("");

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setPasswordError(
        "Please complete all password fields."
      );
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(
        "Your new password must contain at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "The new passwords do not match."
      );
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "Your new password must be different from your current password."
      );
      return;
    }

    try {
      setSavingPassword(true);

      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !userData.user?.email) {
        throw new Error(
          "Unable to verify your staff account. Please sign in again."
        );
      }

      const {
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error(
          "Your current password is incorrect."
        );
      }

      const {
        error: updateError,
      } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setPasswordMessage(
        "Your password has been changed successfully."
      );
    } catch (changeError) {
      console.error(
        "Failed to change staff password:",
        changeError
      );

      setPasswordError(
        changeError instanceof Error
          ? changeError.message
          : "Unable to change your password. Please try again."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-sm font-bold text-slate-400">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center text-sm font-bold text-slate-400">
        Staff profile unavailable.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
            <FiUser size={26} />
          </div>

          <div>
            <h1 className="text-xl font-black text-slate-900">
              {profile.full_name}
            </h1>

            <p className="text-sm font-semibold text-slate-500">
              @{profile.username}
            </p>
          </div>
        </div>

        <div className="mt-7 space-y-4">
          <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
            <FiMail className="text-emerald-700" />

            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">
                Email
              </p>

              <p className="text-sm font-bold text-slate-800">
                {profile.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
            <FiPhone className="text-emerald-700" />

            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">
                Contact Number
              </p>

              <p className="text-sm font-bold text-slate-800">
                {profile.contact_number || "Not provided"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
            <FiUsers className="text-emerald-700" />

            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">
                Response Team
              </p>

              <p className="text-sm font-bold text-slate-800">
                {profile.team_name}
              </p>

              {profile.position && (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {profile.position}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-xs font-black text-emerald-700">
          Account Status: {profile.account_status}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <FiLock size={20} />
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-900">
              Change Password
            </h2>

            <p className="text-xs font-medium text-slate-500">
              Update your password whenever you need to.
            </p>
          </div>
        </div>

        {passwordMessage && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
            {passwordMessage}
          </div>
        )}

        {passwordError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
            {passwordError}
          </div>
        )}

        <form
          onSubmit={handlePasswordChange}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
              Current Password
            </label>

            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) =>
                setCurrentPassword(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              placeholder="Enter your current password"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
              New Password
            </label>

            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              placeholder="Enter your new password"
            />

            <p className="mt-1.5 text-[10px] font-medium text-slate-400">
              Use at least 8 characters for your new password.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
              Confirm New Password
            </label>

            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              placeholder="Re-enter your new password"
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="w-full rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingPassword
              ? "Updating Password..."
              : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}