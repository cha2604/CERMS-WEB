import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { getProfile, updateProfile, type Profile } from "../../lib/ProfileQueries";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import ResidentLayout from "../../pages/resident/Layout";

export default function ResidentProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
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
      });
      setSuccessMessage("Profile updated successfully.");
    } catch (err) {
      console.error("Failed to update profile:", err);
      setErrorMessage("Couldn't save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResidentLayout title="Profile">
      <div className="px-5 py-6">
        {loading ? (
          <div className="space-y-3">
            <div className="h-12 animate-pulse rounded-xl bg-white/60" />
            <div className="h-12 animate-pulse rounded-xl bg-white/60" />
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-700 text-2xl font-bold text-white">
                {fullName.charAt(0).toUpperCase() || "?"}
              </div>
              <p className="mt-3 text-lg font-bold text-slate-800">
                {fullName || "Resident"}
              </p>
              <p className="text-sm text-gray-500">
                {profile?.email || profile?.phone}
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
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

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Phone
                </label>
                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-gray-500">
                  {profile?.phone || "Not set (registered via email)"}
                </div>
              </div>

              {successMessage && (
                <div className="rounded-xl bg-green-50 p-4 text-center text-sm text-green-800">
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </>
        )}
      </div>
    </ResidentLayout>
  );
}