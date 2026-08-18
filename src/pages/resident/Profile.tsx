import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiHome, FiFileText, FiMap, FiUser, FiLogOut } from "react-icons/fi";
import { supabase } from "../../lib/supabase";
import { getProfile, updateProfile, type Profile } from "../../lib/ProfileQueries";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

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

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 pb-24">
      <div className="flex items-center gap-3 bg-white px-5 py-5 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="rounded-full p-2 text-green-700 transition hover:bg-green-50"
        >
          <FiArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Profile</h1>
      </div>

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

            <button
              onClick={handleLogout}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <FiLogOut size={16} />
              Logout
            </button>
          </>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 flex items-center justify-around border-t border-gray-200 bg-white py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
        <Link to="/dashboard" className="flex flex-col items-center gap-1 text-xs font-medium text-gray-400">
          <FiHome size={20} />
          Home
        </Link>
        <Link to="/reports" className="flex flex-col items-center gap-1 text-xs font-medium text-gray-400">
          <FiFileText size={20} />
          Reports
        </Link>
        <Link to="/map" className="flex flex-col items-center gap-1 text-xs font-medium text-gray-400">
          <FiMap size={20} />
          Map
        </Link>
        <Link to="/profile" className="flex flex-col items-center gap-1 text-xs font-medium text-green-700">
          <FiUser size={20} />
          Profile
        </Link>
      </nav>
    </div>
  );
}