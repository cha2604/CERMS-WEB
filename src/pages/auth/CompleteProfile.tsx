import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [area, setArea] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired.");
      const fullAddress = `${area}, Barangay Tankulan, Manolo Fortich, Bukidnon`;
      await supabase.from("profiles").upsert({
        id: user.id,
        username: username.trim(),
        contact_number: contactNumber,
        address: fullAddress,
        profile_completed: true,
        terms_accepted: termsAccepted,
        role: "resident",
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <form onSubmit={handleSave} className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold">Complete Your Profile</h1>
        {error && <p className="text-red-600">{error}</p>}
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required className="w-full border p-2" />
        <input
          type="tel"
          inputMode="numeric"
          maxLength={11}
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
          placeholder="09XXXXXXXXX"
          required
          className="w-full border p-2"
        />
        <select value={area} onChange={(e) => setArea(e.target.value)} required className="w-full border p-2">
          <option value="">Select your Area</option>
          {["CENTRO","TUMAMPONG","ST. JOSEPH","MULBERRY","MANGIMA","LOWER KALANAWAN","UPPER KALANAWAN","PROPER KALANAWAN","UPPER POL-OTON","LOWER POL-OTON","KIHARE","LOWER SOSOHON","UPPER SOSOHON"].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <label className="flex gap-2">
          <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} required />
          I agree to Terms and Conditions
        </label>
        <button disabled={loading || !termsAccepted} className="w-full bg-green-700 text-white p-2">
          {loading ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
