import { useState, type SetStateAction } from "react";
import { useNavigate, Link } from "react-router-dom";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import PasswordInput from "../../components/common/Password";
import Button from "../../components/common/Button";
import {
  FiArrowLeft,
  FiUser,
  FiMapPin,
  FiPhone,
  FiMail,
} from "react-icons/fi";
import { registerWithEmail } from "../../lib/authHelpers";
import { supabase } from "../../lib/supabase";

export default function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await registerWithEmail(fullName, email, password, address);

      if (contactNumber) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase
            .from("profiles")
            .update({ contact_number: contactNumber })
            .eq("id", user.id);
        }
      }

      if (result.session) {
        navigate("/dashboard");
        return;
      }

      setSuccessMessage(
        "Account created! Please check your email to confirm your account."
      );
      setFullName("");
      setAddress("");
      setContactNumber("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Registration failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setErrorMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Google sign up failed:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Google sign up failed."
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-5">
      <Card>
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/login")}
            aria-label="Go back"
            className="rounded-full p-2 text-green-700 transition hover:bg-green-50"
          >
            <FiArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-green-800">CERMS</h1>
          <span className="w-9" />
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Create Account</h2>
          <p className="mt-1 text-sm text-gray-500">
            Fill in the information below
          </p>
        </div>

        <form onSubmit={handleRegister} className="mt-6 space-y-5">
          <Input
            label="Full Name"
            type="text"
            placeholder="Enter full name"
            icon={<FiUser size={16} />}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
          />

          <div>
            <Input
              label="Address"
              type="text"
              placeholder="Enter your address"
              icon={<FiMapPin size={16} />}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              Must be within Barangay Tankulan, Manolo Fortich, Bukidnon.
            </p>
          </div>

          <Input
            label="Contact Number"
            type="tel"
            placeholder="09XXXXXXXXX"
            icon={<FiPhone size={16} />}
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
          />

          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            icon={<FiMail size={16} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e: { target: { value: SetStateAction<string>; }; }) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e: { target: { value: SetStateAction<string>; }; }) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />

          <Button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </Button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-gray-400">OR</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleRegister}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 34.9 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.6C41.5 36.5 44 30.7 44 24c0-1.3-.1-2.5-.4-3.5z"
              />
            </svg>
            Continue with Google
          </button>

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

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-green-700 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}