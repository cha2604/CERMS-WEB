import { useEffect, useState } from "react";
import { FiUser } from "react-icons/fi";
import { supabase } from "../../lib/supabase";
import {
  getProfile,
  updateProfile,
  type Profile,
} from "../../lib/ProfileQueries";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

function usernameFromEmail(email: string | null) {
  if (!email) return "-";
  return email.split("@")[0];
}

export default function ResidentProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);

  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoading(true);
      setErrorMessage("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          if (mounted) {
            setErrorMessage(
              "Your session could not be found. Please log in again."
            );
          }

          setLoading(false);
          return;
        }

        const data = await getProfile(session.user.id);

        if (!mounted) return;

        setProfile(data);
        setFullName(data.full_name || "");
        setAddress(data.address || "");
        setContactNumber(data.contact_number || "");
      } catch (err) {
        console.error("Failed to load profile:", err);

        if (mounted) {
          setErrorMessage(
            "Couldn't load your profile information."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSave(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!profile) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateProfile(profile.id, {
        full_name: fullName,
        contact_number: contactNumber,
        address,
      });

      setProfile({
        ...profile,
        full_name: fullName,
        contact_number: contactNumber,
        address,
      });

      setSuccessMessage(
        "Profile updated successfully."
      );

      setEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);

      setErrorMessage(
        "Couldn't save changes. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const handleCancel = () => {
    if (!profile) return;

    setFullName(profile.full_name || "");
    setAddress(profile.address || "");
    setContactNumber(profile.contact_number || "");
    setErrorMessage("");
    setSuccessMessage("");
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900">
            My Profile
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your account information.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center">
            <div className="h-24 w-24 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-5 h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-56 animate-pulse rounded bg-slate-100" />
          </div>

          <div className="mt-8 space-y-4">
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900">
            My Profile
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your account information.
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-semibold text-rose-700">
            {errorMessage ||
              "Profile information is unavailable."}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">
          My Profile
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage your account information.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-emerald-800 px-6 py-8 sm:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-emerald-800 shadow-lg">
              <FiUser size={42} />
            </div>

            <h2 className="mt-4 text-xl font-black text-white">
              {profile.full_name || "Resident"}
            </h2>

            <p className="mt-1 text-sm font-medium text-emerald-100">
              Resident of Barangay Tankulan
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {successMessage && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-700">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}

          {!editing ? (
            <>
              <div className="divide-y divide-slate-100">
                <ProfileRow
                  label="Full Name"
                  value={profile.full_name || "-"}
                />

                <ProfileRow
                  label="Address"
                  value={profile.address || "-"}
                />

                <ProfileRow
                  label="Contact Number"
                  value={profile.contact_number || "-"}
                />

                <ProfileRow
                  label="Email"
                  value={profile.email || "-"}
                />

                <ProfileRow
                  label="Username"
                  value={usernameFromEmail(
                    profile.email ?? null
                  )}
                />
              </div>

              <div className="mt-7 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage("");
                    setSuccessMessage("");
                    setEditing(true);
                  }}
                  className="rounded-xl bg-emerald-700 px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
                >
                  Edit Profile
                </button>
              </div>
            </>
          ) : (
            <form
              onSubmit={handleSave}
              className="space-y-5"
            >
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                required
              />

              <Input
                label="Address"
                type="text"
                value={address}
                onChange={(e) =>
                  setAddress(e.target.value)
                }
                required
              />

              <Input
                label="Contact Number"
                type="tel"
                value={contactNumber}
                onChange={(e) =>
                  setContactNumber(e.target.value)
                }
                placeholder="09XX-XXX-XXXX"
              />

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email
                </label>

                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  {profile.email || "Not set"}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <div className="flex-1">
                  <Button
                    type="submit"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-sm font-bold text-slate-700">
        {label}
      </span>

      <span className="text-sm font-medium text-slate-500 sm:text-right">
        {value}
      </span>
    </div>
  );
}