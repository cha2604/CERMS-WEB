import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser } from "react-icons/fi";
import { supabase } from "../../lib/supabase";
import { getProfile, updateProfile, type Profile } from "../../lib/ProfileQueries";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import ResidentLayout from "../../pages/resident/Layout";

function usernameFromEmail(email: string | null) {
  if (!email) return "-";
  return email.split("@")[0];
}

export default function ResidentProfile() {
  const navigate = useNavigate();

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

        const data = await getProfile(user.id);

        if (isMounted) {
          setProfile(data);
          setFullName(data.full_name || "");
          setAddress(data.address || "");
          setContactNumber(data.contact_number || "");
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        if (isMounted) setErrorMessage("Couldn't load your profile.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
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
      setProfile({ ...profile, full_name: fullName, contact_number: contactNumber, address });
      setSuccessMessage("Profile updated successfully.");
      setEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setErrorMessage("Couldn't save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResidentLayout title="My Profile">
      <div className="px-5 py-6">
        {loading ? (
          <div className="space-y-3">
            <div className="h-12 animate-pulse rounded-xl bg-white/60" />
            <div className="h-12 animate-pulse rounded-xl bg-white/60" />
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 text-gray-400">
                <FiUser size={36} />
              </div>
            </div>

            {!editing ? (
              <>
                <div className="divide-y divide-gray-100">
                  <ProfileRow label="Full Name" value={profile?.full_name || "-"} />
                  <ProfileRow label="Address" value={profile?.address || "-"} />
                  <ProfileRow
                    label="Contact Number"
                    value={profile?.contact_number || "-"}
                  />
                  <ProfileRow label="Email" value={profile?.email || "-"} />
                  <ProfileRow
                    label="Username"
                    value={usernameFromEmail(profile?.email ?? null)}
                  />
                </div>

                {successMessage && (
                  <div className="mt-5 rounded-xl bg-green-50 p-4 text-center text-sm text-green-800">
                    {successMessage}
                  </div>
                )}

                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-xl bg-green-700 px-8 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
                  >
                    Edit Profile
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSave} className="space-y-5">
                <Input
                  label="Full Name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />

                <Input
                  label="Address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />

                <Input
                  label="Contact Number"
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="09XX-XXX-XXXX"
                />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email
                  </label>
                  <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-gray-500">
                    {profile?.email || "Not set (registered via phone)"}
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
                    {errorMessage}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <div className="flex-1">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </ResidentLayout>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className="text-slate-500">{value}</span>
    </div>
  );
}